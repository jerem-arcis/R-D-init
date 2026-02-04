import { getContext } from "@microsoft/power-apps/app";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PowerContextType {
    isInitialized: boolean;
    powerContext: ReturnType<typeof getContext> | null;
}

const PowerContext = createContext<PowerContextType>({
    isInitialized: false,
    powerContext: null
});

export const usePowerPlatform = () => useContext(PowerContext);

export default function PowerProvider({ children }: { children: ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [powerContext, setPowerContext] = useState<ReturnType<typeof getContext> | null>(null);

    useEffect(() => {
        try {
            const ctx = getContext();
            setPowerContext(ctx);
            console.log('Power Platform context retrieved:', ctx);
            setIsInitialized(true);
        } catch (error) {
            console.error('Failed to get Power Platform context:', error);
            setIsInitialized(true); // Continue pour dev local
        }
    }, []);

    return (
        <PowerContext.Provider value={{ isInitialized, powerContext }}>
            {children}
        </PowerContext.Provider>
    );
}