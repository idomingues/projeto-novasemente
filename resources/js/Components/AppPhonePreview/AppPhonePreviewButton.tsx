import ListCardIconActionButton from '@/Components/ListCard/ListCardIconActionButton';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import type { ButtonHTMLAttributes } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    label?: string;
};

/** Botão de ação padrão: ícone de celular para abrir a pré-visualização no app. */
export default function AppPhonePreviewButton({
    label = 'Pré-visualizar no celular',
    className = '',
    ...props
}: Props) {
    return (
        <ListCardIconActionButton
            {...props}
            label={label}
            className={className}
            icon={<DevicePhoneMobileIcon className="h-5 w-5" aria-hidden />}
        />
    );
}
