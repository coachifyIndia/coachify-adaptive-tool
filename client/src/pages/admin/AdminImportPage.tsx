import { useEffect, useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { adminImportService } from '../../services/admin.service';
import type { ImportBatch } from '../../services/admin.service';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

interface ValidationResult {
  batch_id: string;
  valid_count: number;
  invalid_count: number;
  warnings_count: number;
  errors: Array<{ row: number; errors: string[] }>;
  warnings: Array<{ row: number; warnings: string[] }>;
}

interface ImportProgress {
  batch_id: string;
  status: string;
  progress_percentage: number;
  processed_rows: number;
  total_rows: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  is_complete: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
  validating: { bg: 'bg-blue-100', text: 'text-blue-600', icon: RefreshCw },
  processing: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: RefreshCw },
  completed: { bg: 'bg-green-100', text: 'text-green-600', icon: CheckCircle2 },
  completed_with_errors: { bg: 'bg-orange-100', text: 'text-orange-600', icon: AlertTriangle },
  failed: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
};

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  useEffect(() => {
    loadImportHistory();
  }, []);

  // Poll for import progress
  useEffect(() => {
    if (importProgress && !importProgress.is_complete) {
      const interval = setInterval(async () => {
        try {
          const progress = await adminImportService.getImportProgress(importProgress.batch_id);
          setImportProgress(progress);
          if (progress.is_complete) {
            loadImportHistory();
          }
        } catch (err) {
          console.error('Failed to get import progress:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [importProgress?.batch_id, importProgress?.is_complete]);

  const loadImportHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const history = await adminImportService.getImportHistory(10);
      setImportHistory(history);
    } catch (err: any) {
      console.error('Failed to load import history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
        setError('Please select a JSON or CSV file');
        return;
      }
      setSelectedFile(file);
      setValidationResult(null);
      setImportProgress(null);
      setError(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;

    try {
      setIsValidating(true);
      setError(null);
      const result = await adminImportService.validateImport(selectedFile);
      setValidationResult(result.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartImport = async () => {
    if (!validationResult) return;

    try {
      setIsProcessing(true);
      setError(null);
      await adminImportService.processImport(validationResult.batch_id);

      // Start polling for progress
      const progress = await adminImportService.getImportProgress(validationResult.batch_id);
      setImportProgress(progress);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async (batchId: string) => {
    if (!confirm('Are you sure you want to rollback this import? All imported questions will be deleted.')) {
      return;
    }

    try {
      await adminImportService.rollbackImport(batchId);
      loadImportHistory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rollback failed');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportProgress(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = {
      questions: [
        {
          module_id: 1,
          micro_skill_id: 1,
          question_data: {
            text: 'What is 2 + 2?',
            type: 'single_choice',
            options: ['3', '4', '5', '6'],
            correct_answer: 1,
            solution_steps: [
              { step: 1, action: 'Add the numbers', calculation: '2 + 2', result: '4' },
            ],
            hints: [{ level: 1, text: 'Think about counting' }],
          },
          metadata: {
            difficulty_level: 1,
            expected_time_seconds: 30,
            points: 5,
            tags: ['arithmetic', 'addition'],
          },
          status: 'draft',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
          <p className="text-gray-500 mt-1">Import multiple questions at once</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="w-4 h-4" />
          Download Template
        </Button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Questions File</h2>

        {/* Dropzone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
            selectedFile
              ? 'border-indigo-300 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              setSelectedFile(file);
              setValidationResult(null);
              setImportProgress(null);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-10 h-10 text-indigo-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetForm();
                }}
                className="ml-4 p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-1">
                Drag and drop your file here, or{' '}
                <span className="text-indigo-600 font-medium cursor-pointer">browse</span>
              </p>
              <p className="text-sm text-gray-500">Supports JSON and CSV files</p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Actions */}
        {selectedFile && !importProgress && (
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              variant="outline"
              className="gap-2"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Validate File
                </>
              )}
            </Button>
            {validationResult && validationResult.valid_count > 0 && (
              <Button onClick={handleStartImport} disabled={isProcessing} className="gap-2">
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Start Import ({validationResult.valid_count} questions)
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Validation Results */}
        {validationResult && !importProgress && (
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Validation Results</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-500 mb-1" />
                <p className="text-2xl font-bold text-green-700">{validationResult.valid_count}</p>
                <p className="text-sm text-green-600">Valid</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="w-5 h-5 text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-700">{validationResult.invalid_count}</p>
                <p className="text-sm text-red-600">Invalid</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mb-1" />
                <p className="text-2xl font-bold text-yellow-700">
                  {validationResult.warnings_count}
                </p>
                <p className="text-sm text-yellow-600">Warnings</p>
              </div>
            </div>

            {/* Errors List */}
            {validationResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">Errors</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {validationResult.errors.map((err, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-red-700">Row {err.row}:</span>
                      <ul className="ml-4 text-red-600">
                        {err.errors.map((e, j) => (
                          <li key={j}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings List */}
            {validationResult.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {validationResult.warnings.map((warn, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-yellow-700">Row {warn.row}:</span>
                      <ul className="ml-4 text-yellow-600">
                        {warn.warnings.map((w, j) => (
                          <li key={j}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Progress */}
        {importProgress && (
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Import Progress</h3>

            {/* Progress Bar */}
            <div className="relative">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    importProgress.is_complete
                      ? importProgress.failed > 0
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                      : 'bg-indigo-500'
                  )}
                  style={{ width: `${importProgress.progress_percentage}%` }}
                />
              </div>
              <p className="text-center text-sm font-medium text-gray-600 mt-2">
                {importProgress.progress_percentage}% ({importProgress.processed_rows} /{' '}
                {importProgress.total_rows})
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-xl font-bold text-green-700">{importProgress.successful}</p>
                <p className="text-xs text-green-600">Successful</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-xl font-bold text-red-700">{importProgress.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xl font-bold text-gray-700">{importProgress.skipped}</p>
                <p className="text-xs text-gray-600">Skipped</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                  STATUS_COLORS[importProgress.status]?.bg,
                  STATUS_COLORS[importProgress.status]?.text
                )}
              >
                {importProgress.status.replace(/_/g, ' ')}
              </span>
              {importProgress.is_complete && (
                <Button variant="outline" onClick={resetForm}>
                  New Import
                </Button>
              )}
            </div>

            {/* Import Errors */}
            {importProgress.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">Import Errors</h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm text-red-600">
                  {importProgress.errors.map((err, i) => (
                    <p key={i}>
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import History</h2>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : importHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No imports yet</p>
        ) : (
          <div className="space-y-3">
            {importHistory.map((batch) => {
              const statusConfig = STATUS_COLORS[batch.status] || STATUS_COLORS.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={batch.batch_id} className="border border-gray-200 rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setExpandedBatch(expandedBatch === batch.batch_id ? null : batch.batch_id)
                    }
                  >
                    <div className="flex items-center gap-4">
                      <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{batch.file_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(batch.created_at).toLocaleString()} • {batch.total_rows} rows
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          statusConfig.bg,
                          statusConfig.text
                        )}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {batch.status.replace(/_/g, ' ')}
                      </span>
                      <div className="text-right text-sm">
                        <p className="text-green-600">{batch.successful} success</p>
                        {batch.failed > 0 && (
                          <p className="text-red-600">{batch.failed} failed</p>
                        )}
                      </div>
                      {expandedBatch === batch.batch_id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedBatch === batch.batch_id && (
                    <div className="px-4 pb-4 border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-500">Processed</p>
                          <p className="font-medium">{batch.processed_rows}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Successful</p>
                          <p className="font-medium text-green-600">{batch.successful}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Failed</p>
                          <p className="font-medium text-red-600">{batch.failed}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Skipped</p>
                          <p className="font-medium">{batch.skipped}</p>
                        </div>
                      </div>

                      {batch.import_errors && batch.import_errors.length > 0 && (
                        <div className="bg-red-50 rounded p-3 mb-4">
                          <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                          <div className="max-h-24 overflow-y-auto text-sm text-red-600">
                            {batch.import_errors.slice(0, 5).map((err, i) => (
                              <p key={i}>
                                Row {err.row}: {err.message}
                              </p>
                            ))}
                            {batch.import_errors.length > 5 && (
                              <p className="text-red-500 font-medium">
                                ... and {batch.import_errors.length - 5} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {batch.status === 'completed' && batch.successful > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRollback(batch.batch_id)}
                          className="gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Rollback Import
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
