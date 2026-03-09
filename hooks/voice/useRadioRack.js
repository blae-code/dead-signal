import { useState } from 'react';
import { INITIAL_RADIO_DEVICE_STATE } from '../lib/voice/constants';

/**
 * @returns {{radioDevices: import('../lib/voice/models').RadioDeviceState[], setRadioDevices: (devices: import('../lib/voice/models').RadioDeviceState[]) => void, setActiveRadio: (radioId: string) => void}}
 */
export function useRadioRack() {
    const [radioDevices, setRadioDevices] = useState([
        INITIAL_RADIO_DEVICE_STATE,
        {
            ...INITIAL_RADIO_DEVICE_STATE,
            radioId: 'RADIO_2',
            label: 'Squad Net',
            tunedNetId: 'net-squad-alpha',
            tunedFrequencyLabel: '462.5625 MHz',
            isSelectedTxRadio: false,
            mode: 'monitor',
        }
    ]);

    const setActiveRadio = (radioId) => {
        setRadioDevices(devices => devices.map(d => ({
            ...d,
            isSelectedTxRadio: d.radioId === radioId,
            mode: d.radioId === radioId ? 'transmit' : 'monitor',
        })));
    };

    return {
        radioDevices,
        setRadioDevices,
        setActiveRadio,
    };
}
