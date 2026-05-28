import TextInput from '@/Components/TextInput';
import { brDateToIso, isIsoDateInRange, isoToBrDate, maskBrDateTyping } from '@/utils/brDate';
import { forwardRef, InputHTMLAttributes, useEffect, useRef, useState } from 'react';

type BrDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
    /** Valor em ISO `YYYY-MM-DD` (vazio = sem data). */
    value: string;
    onChange: (iso: string) => void;
    /** Limites opcionais em ISO `YYYY-MM-DD`. */
    min?: string;
    max?: string;
    isFocused?: boolean;
};

export default forwardRef<HTMLInputElement, BrDateInputProps>(function BrDateInput(
    { value, onChange, min, max, onBlur, onFocus, className, placeholder = 'DD/MM/AAAA', ...props },
    ref,
) {
    const [display, setDisplay] = useState(() => isoToBrDate(value));
    const focusedRef = useRef(false);
    const lastEmitted = useRef(value);

    useEffect(() => {
        if (!focusedRef.current && value !== lastEmitted.current) {
            setDisplay(isoToBrDate(value));
            lastEmitted.current = value;
        }
    }, [value]);

    const emitIso = (iso: string) => {
        lastEmitted.current = iso;
        onChange(iso);
    };

    const tryEmitFromDisplay = (nextDisplay: string) => {
        if (nextDisplay === '') {
            emitIso('');
            return;
        }
        const iso = brDateToIso(nextDisplay);
        if (iso && isIsoDateInRange(iso, min, max)) {
            emitIso(iso);
        }
    };

    return (
        <TextInput
            {...props}
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder={placeholder}
            maxLength={10}
            className={className}
            value={display}
            onFocus={(e) => {
                focusedRef.current = true;
                onFocus?.(e);
            }}
            onChange={(e) => {
                const masked = maskBrDateTyping(e.target.value);
                setDisplay(masked);
                tryEmitFromDisplay(masked);
            }}
            onBlur={(e) => {
                focusedRef.current = false;
                if (display === '') {
                    emitIso('');
                } else {
                    const iso = brDateToIso(display);
                    if (iso && isIsoDateInRange(iso, min, max)) {
                        const normalized = isoToBrDate(iso);
                        setDisplay(normalized);
                        emitIso(iso);
                    } else {
                        setDisplay(isoToBrDate(value));
                        lastEmitted.current = value;
                    }
                }
                onBlur?.(e);
            }}
        />
    );
});
