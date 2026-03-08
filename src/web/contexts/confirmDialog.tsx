import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  checkboxLabel?: string;
  confirmText?: string;
  cancelText?: string;
  requireCheckbox?: boolean;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmDialogContextType {
  showConfirmDialog: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<
  ConfirmDialogContextType | undefined
>(undefined);

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      'useConfirmDialog must be used within a ConfirmDialogProvider',
    );
  }
  return context;
};

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export const ConfirmDialogProvider: React.FC<ConfirmDialogProviderProps> = ({
  children,
}) => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showConfirmDialog = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          ...options,
          isOpen: true,
          onConfirm: () => {
            setDialogState((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setDialogState((prev) => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    [],
  );

  return (
    <ConfirmDialogContext.Provider value={{ showConfirmDialog }}>
      {children}
      {dialogState.isOpen && <ConfirmDialogModal {...dialogState} />}
    </ConfirmDialogContext.Provider>
  );
};

interface ConfirmDialogModalProps extends ConfirmDialogState {}

const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
  title,
  message,
  checkboxLabel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requireCheckbox = false,
  onConfirm,
  onCancel,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleConfirm = () => {
    if (requireCheckbox && !isChecked) {
      return;
    }
    onConfirm();
  };

  return (
    <div
      className='fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm'
      onClick={onCancel}
    >
      <div
        className='bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700'
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className='text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100'>
            {title}
          </h3>
        )}

        <p className='text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-line'>
          {message}
        </p>

        {checkboxLabel && (
          <label className='flex items-start gap-3 mb-6 cursor-pointer group'>
            <input
              type='checkbox'
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className='mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2'
            />
            <span className='text-sm text-gray-700 dark:text-gray-300 select-none group-hover:text-gray-900 dark:group-hover:text-gray-100'>
              {checkboxLabel}
            </span>
          </label>
        )}

        <div className='flex gap-3 justify-end'>
          <button
            onClick={onCancel}
            className='px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={requireCheckbox && !isChecked}
            className='px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600'
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
