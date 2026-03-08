import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';

type Semver = [number, number, number];

const parseSemver = (value: string): Semver | null => {
  const normalized = value.trim().replace(/^v/i, '');
  const parts = normalized.split('.');
  if (parts.length < 3) {
    return null;
  }
  const nums = parts.slice(0, 3).map((part) => Number(part));
  if (nums.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }
  return [nums[0], nums[1], nums[2]];
};

const compareSemver = (a: string, b: string): number | null => {
  const av = parseSemver(a);
  const bv = parseSemver(b);
  if (!av || !bv) {
    return null;
  }
  if (av[0] !== bv[0]) return av[0] - bv[0];
  if (av[1] !== bv[1]) return av[1] - bv[1];
  return av[2] - bv[2];
};

const fetchLatestReleaseTag = async (repo: string): Promise<string | null> => {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'dead-signal-security-check',
    },
  });
  if (!res.ok) {
    return null;
  }
  const json = await res.json() as Record<string, unknown>;
  return typeof json.tag_name === 'string' ? json.tag_name : null;
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const panelCurrent = Deno.env.get('PTERODACTYL_PANEL_VERSION')?.trim() || null;
    const wingsCurrent = Deno.env.get('PTERODACTYL_WINGS_VERSION')?.trim() || null;
    const [panelLatest, wingsLatest] = await Promise.all([
      fetchLatestReleaseTag('pterodactyl/panel'),
      fetchLatestReleaseTag('pterodactyl/wings'),
    ]);

    const advisories = [
      {
        id: 'GHSA-24wv-6c99-f843',
        package: 'panel',
        severity: 'critical',
        patched_versions: ['v1.11.11', 'v1.12.0'],
        url: 'https://github.com/advisories/GHSA-24wv-6c99-f843',
      },
      {
        id: 'GHSA-8w7m-w749-rx98',
        package: 'wings',
        severity: 'medium',
        patched_versions: ['v1.11.12', 'v1.12.0'],
        url: 'https://github.com/advisories/GHSA-8w7m-w749-rx98',
      },
    ];

    if (!panelLatest || !wingsLatest) {
      throw new AppError(502, 'release_lookup_failed', 'Unable to fetch latest release metadata from GitHub.');
    }

    const panelState = panelCurrent
      ? compareSemver(panelCurrent, panelLatest)
      : null;
    const wingsState = wingsCurrent
      ? compareSemver(wingsCurrent, wingsLatest)
      : null;

    return Response.json({
      success: true,
      retrieved_at: new Date().toISOString(),
      current: {
        panel: panelCurrent,
        wings: wingsCurrent,
      },
      latest: {
        panel: panelLatest,
        wings: wingsLatest,
      },
      update_status: {
        panel: panelCurrent
          ? (panelState === null ? 'unknown' : panelState >= 0 ? 'up_to_date_or_newer' : 'update_recommended')
          : 'not_configured',
        wings: wingsCurrent
          ? (wingsState === null ? 'unknown' : wingsState >= 0 ? 'up_to_date_or_newer' : 'update_recommended')
          : 'not_configured',
      },
      advisories,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
