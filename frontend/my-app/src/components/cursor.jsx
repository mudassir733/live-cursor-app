import { usePerfectCursor } from "../hooks/useCursor";
import { useEffect, useRef } from "react";

export function Cursor({ point, color, size, shadow }) {
    const cursorRef = useRef(null);

    const onPointChange = usePerfectCursor((point) => {
        if (cursorRef.current) {
            cursorRef.current.style.left = `${point[0]}px`;
            cursorRef.current.style.top = `${point[1]}px`;
        }
    }, point);

    useEffect(() => {
        onPointChange(point);
    }, [point, onPointChange]);

    return (
        <div
            ref={cursorRef}
            style={{
                position: "absolute",
                width: size,
                height: size,
                backgroundColor: color,
                borderRadius: "50%",
                transform: "translate(-50%, -50%)",
                boxShadow: shadow ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "none",
                pointerEvents: "none",
            }}
        />
    );
}