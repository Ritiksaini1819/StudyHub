import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export function Alert({ type = 'info', title, message, onDismiss }: AlertProps) {
  const icons = {
    error: XCircle,
    success: CheckCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    error: 'bg-red-950 border-red-800 text-red-200',
    success: 'bg-emerald-950 border-emerald-800 text-emerald-200',
    warning: 'bg-yellow-950 border-yellow-800 text-yellow-200',
    info: 'bg-blue-950 border-blue-800 text-blue-200',
  };

  const Icon = icons[type];

  return (
    <div className={`flex gap-3 p-4 border rounded-lg ${colors[type]}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-70 hover:opacity-100">
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
