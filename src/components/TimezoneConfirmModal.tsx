import React from 'react';
import { Globe, AlertCircle } from 'lucide-react';

interface TimezoneConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceTimezone: string;
  userTimezone: string;
  dateExample: string;
  convertedDateExample: string;
}

const TimezoneConfirmModal: React.FC<TimezoneConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sourceTimezone,
  userTimezone,
  dateExample,
  convertedDateExample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Timezone</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-500 mt-1" size={20} />
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                The hackathon times are in <strong>{sourceTimezone}</strong>, but your current timezone is <strong>{userTimezone}</strong>.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Would you like to convert all times to your timezone?
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Original Time:</p>
                <p className="text-gray-600 dark:text-gray-400">{dateExample}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Time:</p>
                <p className="text-blue-600 dark:text-blue-400">{convertedDateExample}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Keep Original
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Convert to My Timezone
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimezoneConfirmModal; 