import { Room } from 'livekit-client';

/**
 * Fetches a LiveKit token from the server.
 * @param {string} roomName - The name of the room to join.
 * @param {string} participantIdentity - The identity of the participant.
 * @returns {Promise<string>} The LiveKit token.
 */
export async function fetchLiveKitToken(roomName, participantIdentity) {
    const response = await fetch('/api/livekitToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            roomName,
            participantIdentity,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch LiveKit token');
    }

    const { token } = await response.json();
    return token;
}

/**
 * Connects to a LiveKit room.
 * @param {string} roomName - The name of the room to join.
 * @param {string} token - The LiveKit token.
 * @returns {Promise<Room>} The LiveKit room object.
 */
export async function connectToRoom(roomName, token) {
    const room = new Room();

    await room.connect(import.meta.env.VITE_LIVEKIT_URL, token);

    return room;
}
