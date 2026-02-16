import { Wifi, WifiOff } from "lucide-react";
import "../../pages/eco2apps/connect/DataTransfer.css";

export default function ConnectionStatus({ status = "disconnected", peerCount = 0 }) {
    const statusConfig = {
        connected: {
            label: "",
            icon: Wifi,
            className: "status-connected bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
        },
        connecting: {
            label: "Connecting...",
            icon: Wifi,
            className: "status-connecting bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400",
        },
        disconnected: {
            label: "",
            icon: WifiOff,
            className: "status-disconnected bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
        },
    };

    const config = statusConfig[status] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
        <div className={`status-indicator ${config.className}`}>
            <span className="status-dot"></span>
            <Icon className="w-4 h-4" />
            <span>{config.label}</span>
            {status === "connected" && peerCount > 0 && (
                <span className="ml-1 opacity-70">({peerCount})</span>
            )}
        </div>
    );
}
