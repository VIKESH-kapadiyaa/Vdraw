import { useState, useEffect } from 'react';

export function useBandwidth() {
    const [isLowBandwidth, setIsLowBandwidth] = useState(false);

    useEffect(() => {
        const checkConnection = () => {
            // @ts-ignore
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                // downlink is in Mbps. < 2 Mbps is considered low for real-time rich sync
                if (connection.downlink && connection.downlink < 1.5) {
                    setIsLowBandwidth(true);
                } else if (connection.saveData) {
                    setIsLowBandwidth(true);
                } else {
                    setIsLowBandwidth(false);
                }
            }
        };

        checkConnection();
        // @ts-ignore
        navigator.connection?.addEventListener('change', checkConnection);
        return () => {
            // @ts-ignore
            navigator.connection?.removeEventListener('change', checkConnection);
        }
    }, []);

    return isLowBandwidth;
}
