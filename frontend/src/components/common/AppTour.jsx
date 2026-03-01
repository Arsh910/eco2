import React, { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useAuth } from '../../context/AuthContext';

const AppTour = ({ steps, run, onFinish, tourKey }) => {
    const [runTour, setRunTour] = useState(false);
    const { user } = useAuth(); // Could be used to store preference in DB later

    useEffect(() => {
        // Check local storage if this tour has been seen
        const seen = localStorage.getItem(`eco2_tour_${tourKey}`);
        if (!seen && run) {
            setRunTour(true);
        }
    }, [run, tourKey]);

    const handleJoyrideCallback = (data) => {
        const { status, type } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem(`eco2_tour_${tourKey}`, 'true');
            if (onFinish) onFinish();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={runTour}
            continuous
            showProgress
            showSkipButton
            styles={{
                options: {
                    primaryColor: '#8b5cf6', // Violet-500
                    textColor: '#1e293b',
                    zIndex: 10000,
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    backgroundColor: '#8b5cf6',
                },
                buttonBack: {
                    color: '#8b5cf6',
                }
            }}
            callback={handleJoyrideCallback}
        />
    );
};

export default AppTour;
