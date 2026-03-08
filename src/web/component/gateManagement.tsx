import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Server,
  Activity,
  Edit3,
  Save,
  Zap,
  Trash2,
} from 'lucide-react';
import { useNotification } from '../contexts/notification';
import { useConfirmDialog } from '../contexts/confirmDialog';
import { useServers } from '../contexts/servers';
import { NotificationType } from '../utils/enums';
import type { GateConfig } from '@/utils/type';
import {
  isReadOnlyField,
  filterGateConfig,
  isGateConfigEqual,
  getFieldMetadata,
  getFieldOptions,
  getFieldDefault,
  getFieldType,
  getAvailableFieldSuggestions,
  getFieldNameSuggestions,
  type FieldSuggestion,
  type GateConfig as TypedGateConfig,
} from '@/utils/gateConfig';

interface GateStatus {
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  conditions: Array<{
    type: string;
    status: string;
    message?: string;
  }>;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

type AddFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';
type AddFieldDraft = {
  key: string;
  type: AddFieldType;
  value: string;
};

const defaultAddFieldDraft: AddFieldDraft = {
  key: '',
  type: 'string',
  value: '',
};

function mapFieldTypeToDraftType(
  type: FieldSuggestion['metadata']['type'],
): AddFieldType {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';
  if (type === 'array') return 'array';
  return 'string';
}

function createDraftFromSuggestion(
  suggestion: FieldSuggestion,
  previousDraft: AddFieldDraft,
): AddFieldDraft {
  const suggestedType = mapFieldTypeToDraftType(suggestion.metadata.type);
  const defaultValue = suggestion.metadata.defaultValue;

  if (
    suggestedType === 'object' ||
    suggestedType === 'array' ||
    suggestedType === 'null'
  ) {
    return {
      key: suggestion.key,
      type: suggestedType,
      value: '',
    };
  }

  if (defaultValue !== undefined && defaultValue !== null) {
    return {
      key: suggestion.key,
      type: suggestedType,
      value: String(defaultValue),
    };
  }

  return {
    ...previousDraft,
    key: suggestion.key,
    type: suggestedType,
  };
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function GateManagement() {
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gateConfig, setGateConfig] = useState<GateConfig | null>(null);
  const [editableConfig, setEditableConfig] = useState<GateConfig | null>(null);
  const [arrayDrafts, setArrayDrafts] = useState<Record<string, string>>({});
  const [addFieldDrafts, setAddFieldDrafts] = useState<
    Record<string, AddFieldDraft>
  >({});
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addNotification } = useNotification();
  const { showConfirmDialog } = useConfirmDialog();
  const { serverInfo } = useServers();

  /**
   * Check if a server key/domain is controlled by the panel
   * Servers and forcedHosts controlled by the panel cannot be deleted
   */
  const isPanelControlledItem = (path: string, key: string): boolean => {
    // Check if it's a server in config.servers
    if (path === 'config.servers') {
      // If the server name exists in serverInfo, it's panel-controlled
      return serverInfo.some((server) => server.name === key);
    }

    // Check if it's in config.forcedHosts
    if (path === 'config.forcedHosts') {
      // If the domain name exists in serverInfo, it's panel-controlled
      return serverInfo.some((server) => server.domain === key);
    }

    return false;
  };

  const deleteConfigField = (path: string, key: string) => {
    if (isPanelControlledItem(path, key)) {
      addNotification(
        `Cannot delete "${key}" - it is controlled by the server panel`,
        NotificationType.Error,
      );
      return;
    }

    setEditableConfig((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev) as Record<string, any>;
      const segments = path.split('.');
      let current: Record<string, any> = next;

      for (const segment of segments) {
        if (!segment) continue;
        if (!(segment in current)) {
          return prev;
        }
        if (typeof current[segment] !== 'object' || current[segment] === null) {
          return prev;
        }
        current = current[segment] as Record<string, any>;
      }

      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        return prev;
      }

      delete current[key];

      return next as GateConfig;
    });
  };

  const fetchGateStatus = async () => {
    try {
      const response = await fetch('/api/gate-manage');
      if (response.ok) {
        const data = await response.json();
        setGateStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch Gate status:', error);
    }
  };

  const fetchGateConfig = async () => {
    try {
      const response = await fetch('/api/gate-manage', {
        method: 'PATCH',
      });
      if (response.ok) {
        const data = await response.json();
        const configData = data.data as GateConfig;
        setGateConfig(configData);
        setEditableConfig(deepClone(configData));
        setArrayDrafts({});
        setAddFieldDrafts({});
      }
    } catch (error) {
      console.error('Failed to fetch Gate config:', error);
      addNotification(
        'Failed to load Gate configuration',
        NotificationType.Error,
      );
    }
  };

  const setConfigValueByPath = (path: string, value: JsonValue) => {
    setEditableConfig((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev) as Record<string, any>;
      const segments = path.split('.');
      let current: Record<string, any> = next;

      for (let i = 0; i < segments.length - 1; i += 1) {
        const segment = segments[i]!;
        if (typeof current[segment] !== 'object' || current[segment] === null) {
          current[segment] = {};
        }
        current = current[segment] as Record<string, any>;
      }

      current[segments[segments.length - 1]!] = value;
      return next as GateConfig;
    });
  };

  const enforceReadOnlyFields = (original: GateConfig, edited: GateConfig) => {
    const next = deepClone(edited);

    next.api = deepClone(original.api);
    next.config.bind = original.config.bind;
    next.config.forwarding = deepClone(original.config.forwarding);

    return next;
  };

  const parseAddFieldValue = (draft: AddFieldDraft): JsonValue => {
    switch (draft.type) {
      case 'string':
        return draft.value;
      case 'number': {
        const n = Number(draft.value);
        if (Number.isNaN(n)) {
          throw new Error('Invalid number value');
        }
        return n;
      }
      case 'boolean': {
        const lowered = draft.value.trim().toLowerCase();
        if (lowered === 'true') return true;
        if (lowered === 'false') return false;
        throw new Error('Boolean value must be true or false');
      }
      case 'object':
        return {};
      case 'array':
        return [];
      case 'null':
        return null;
      default:
        return draft.value;
    }
  };

  const addFieldToObject = (objectPath: string) => {
    const draft = addFieldDrafts[objectPath] ?? defaultAddFieldDraft;
    const key = draft.key.trim();

    if (!editableConfig) return;
    if (isReadOnlyField(objectPath)) {
      addNotification(
        `Cannot add field under read-only path: ${objectPath}`,
        NotificationType.Error,
      );
      return;
    }
    if (key.length === 0) {
      addNotification('Field key is required', NotificationType.Error);
      return;
    }
    if (key.includes('.')) {
      addNotification('Field key cannot contain dots', NotificationType.Error);
      return;
    }

    let parsedValue: JsonValue;
    try {
      parsedValue = parseAddFieldValue(draft);
    } catch (error) {
      addNotification((error as Error).message, NotificationType.Error);
      return;
    }

    let added = false;
    setEditableConfig((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev) as Record<string, any>;
      const segments = objectPath.split('.');
      let current: Record<string, any> = next;

      for (const segment of segments) {
        if (!segment) continue;
        if (typeof current[segment] !== 'object' || current[segment] === null) {
          current[segment] = {};
        }
        current = current[segment] as Record<string, any>;
      }

      if (Object.prototype.hasOwnProperty.call(current, key)) {
        return prev;
      }

      current[key] = parsedValue;
      added = true;
      return next as GateConfig;
    });

    if (!added) {
      addNotification(`Field ${key} already exists`, NotificationType.Error);
      return;
    }

    setAddFieldDrafts((prev) => ({
      ...prev,
      [objectPath]: defaultAddFieldDraft,
    }));
    addNotification(`Added field ${key}`, NotificationType.Success, 1200);
  };

  const handleRestart = async () => {
    const confirmed = await showConfirmDialog({
      title: 'Restart Gate Proxy',
      message:
        'Are you sure you want to restart the Gate proxy server?\n\nThis will temporarily disconnect all players from the network.',
      confirmText: 'Restart',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/gate-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restart',
        }),
      });

      if (response.ok) {
        addNotification(
          'Gate server restart initiated',
          NotificationType.Success,
        );
        setTimeout(fetchGateStatus, 2000);
      } else {
        addNotification(
          'Failed to restart Gate server',
          NotificationType.Error,
        );
      }
    } catch (error) {
      addNotification('Failed to restart Gate server', NotificationType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!gateConfig || !editableConfig) return;

    const confirmed = await showConfirmDialog({
      title: 'Update Gate Configuration',
      message:
        'Updating the Gate proxy configuration will restart the server and temporarily disconnect all players.\n\nAre you sure you want to continue?',
      checkboxLabel: 'I understand this will restart the Gate proxy',
      requireCheckbox: true,
      confirmText: 'Update & Restart',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      const finalConfig = enforceReadOnlyFields(gateConfig, editableConfig);

      // Validate config structure against YAML schema
      let validatedConfig: GateConfig;
      try {
        validatedConfig = filterGateConfig(finalConfig);
      } catch (validationError) {
        addNotification(
          `Configuration validation failed: ${(validationError as Error).message}`,
          NotificationType.Error,
        );
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/gate-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateConfig',
          config: validatedConfig,
        }),
      });

      if (response.ok) {
        addNotification(
          'Gate configuration updated successfully',
          NotificationType.Success,
        );
        setIsEditingConfig(false);
        setGateConfig(finalConfig);
        setEditableConfig(deepClone(finalConfig));
        setTimeout(fetchGateStatus, 2000);
      } else {
        const data = await response.json();
        addNotification(
          data.message || 'Failed to update Gate configuration',
          NotificationType.Error,
        );
      }
    } catch (error) {
      addNotification(
        'Failed to update Gate configuration',
        NotificationType.Error,
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchGateStatus();
    fetchGateConfig();
    const interval = setInterval(fetchGateStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!gateStatus) return 'bg-gray-500';
    if (
      gateStatus.availableReplicas === gateStatus.replicas &&
      gateStatus.replicas > 0
    ) {
      return 'bg-green-500';
    }
    if (gateStatus.replicas === 0) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!gateStatus) return 'Unknown';
    if (
      gateStatus.availableReplicas === gateStatus.replicas &&
      gateStatus.replicas > 0
    ) {
      return 'Running';
    }
    if (gateStatus.replicas === 0) return 'Stopped';
    return 'Starting';
  };

  const renderValueEditor = (
    keyName: string,
    value: JsonValue,
    path: string,
  ): React.ReactNode => {
    const readOnly = isReadOnlyField(path);

    if (Array.isArray(value)) {
      const draft = arrayDrafts[path] ?? JSON.stringify(value, null, 2);
      return (
        <div className='flex flex-col gap-1'>
          <label className='text-sm font-medium'>[{keyName}] Array</label>
          <textarea
            className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 font-mono text-sm disabled:opacity-70'
            rows={4}
            value={draft}
            disabled={readOnly}
            onChange={(e) => {
              const nextText = e.target.value;
              setArrayDrafts((prev) => ({ ...prev, [path]: nextText }));
            }}
            onBlur={() => {
              if (readOnly) return;
              const currentDraft =
                arrayDrafts[path] ?? JSON.stringify(value, null, 2);
              try {
                const parsed = JSON.parse(currentDraft) as JsonValue;
                if (!Array.isArray(parsed)) {
                  throw new Error('Not an array');
                }

                // For config.try array, check if panel-controlled servers are being removed
                if (path === 'config.try') {
                  const parsedTry = parsed as (
                    | string
                    | number
                    | boolean
                    | null
                  )[];
                  const panelControlledServers = serverInfo.map((s) => s.name);
                  const originalTry =
                    (value as (string | number | boolean | null)[]) || [];
                  const removedServers = originalTry.filter(
                    (s) => s !== null && !parsedTry.includes(s),
                  );
                  const unauthorizedRemovals = removedServers.filter(
                    (name) =>
                      name !== null &&
                      panelControlledServers.includes(name as string),
                  );

                  if (unauthorizedRemovals.length > 0) {
                    throw new Error(
                      `Cannot remove panel-managed servers from try list: ${unauthorizedRemovals.join(', ')}`,
                    );
                  }
                }

                setConfigValueByPath(path, parsed);
              } catch (error) {
                addNotification(
                  error instanceof Error
                    ? `${error.message} Reverting value.`
                    : `Invalid array JSON for ${path}. Reverting value.`,
                  NotificationType.Error,
                );
                setArrayDrafts((prev) => ({
                  ...prev,
                  [path]: JSON.stringify(value, null, 2),
                }));
              }
            }}
          />
          {readOnly && (
            <span className='text-xs text-amber-600 dark:text-amber-400'>
              Read-only field
            </span>
          )}
        </div>
      );
    }

    if (value !== null && typeof value === 'object') {
      const objectValue = value as JsonObject;
      const addDraft = addFieldDrafts[path] ?? defaultAddFieldDraft;
      const existingKeys = new Set(Object.keys(objectValue));
      const availableSuggestions = getAvailableFieldSuggestions(path).filter(
        (suggestion) => !existingKeys.has(suggestion.key),
      );
      const keySuggestions = getFieldNameSuggestions(path).filter(
        (key) => !existingKeys.has(key),
      );
      const selectedSuggestion = availableSuggestions.find(
        (suggestion) => suggestion.key === addDraft.key.trim(),
      );
      const suggestionListId = `field-suggestion-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

      return (
        <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/30'>
          <div className='text-sm font-semibold mb-2'>[{keyName}] Object</div>
          <div className='flex flex-col gap-2'>
            {Object.entries(objectValue).map(([childKey, childValue]) => {
              const childPath = `${path}.${childKey}`;
              const isPanelControlled = isPanelControlledItem(path, childKey);
              return (
                <div
                  key={childPath}
                  className='relative group'
                >
                  {renderValueEditor(
                    childKey,
                    childValue as JsonValue,
                    childPath,
                  )}
                  {!readOnly && !isPanelControlled && (
                    <button
                      type='button'
                      onClick={() => deleteConfigField(path, childKey)}
                      className='absolute top-0 right-0 p-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 opacity-0 group-hover:opacity-100 transition-opacity'
                      title={`Delete ${childKey}`}
                    >
                      <Trash2 className='w-3 h-3' />
                    </button>
                  )}
                  {isPanelControlled && (
                    <div
                      className='absolute top-0 right-0 p-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200'
                      title='This item is managed by the server panel and cannot be deleted'
                    >
                      <Trash2 className='w-3 h-3 opacity-50' />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!readOnly && (
            <div className='mt-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-2'>
              <div className='mb-2 text-xs font-medium text-gray-600 dark:text-gray-300'>
                Add New Field
              </div>
              {availableSuggestions.length > 0 && (
                <div className='mb-2'>
                  <label className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'>
                    Suggested Fields (Optional)
                  </label>
                  <select
                    value={selectedSuggestion?.key ?? ''}
                    className='w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-900'
                    onChange={(e) => {
                      const selectedKey = e.target.value;
                      if (!selectedKey) return;
                      const suggestion = availableSuggestions.find(
                        (item) => item.key === selectedKey,
                      );
                      if (!suggestion) return;

                      setAddFieldDrafts((prev) => ({
                        ...prev,
                        [path]: createDraftFromSuggestion(suggestion, addDraft),
                      }));
                    }}
                  >
                    <option value=''>Select a suggested field...</option>
                    {availableSuggestions.map((suggestion) => (
                      <option
                        key={suggestion.path}
                        value={suggestion.key}
                      >
                        {suggestion.metadata.label
                          ? `${suggestion.metadata.label} (${suggestion.key})`
                          : suggestion.key}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className='grid grid-cols-1 gap-2 md:grid-cols-4'>
                <input
                  type='text'
                  placeholder='key'
                  value={addDraft.key}
                  list={
                    keySuggestions.length > 0 ? suggestionListId : undefined
                  }
                  className='w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-900'
                  onChange={(e) => {
                    const next = e.target.value;
                    setAddFieldDrafts((prev) => ({
                      ...prev,
                      [path]: { ...addDraft, key: next },
                    }));
                  }}
                />
                {keySuggestions.length > 0 && (
                  <datalist id={suggestionListId}>
                    {keySuggestions.map((suggestedKey) => (
                      <option
                        key={suggestedKey}
                        value={suggestedKey}
                      />
                    ))}
                  </datalist>
                )}

                <select
                  value={addDraft.type}
                  className='w-full rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-900'
                  onChange={(e) => {
                    const nextType = e.target.value as AddFieldType;
                    setAddFieldDrafts((prev) => ({
                      ...prev,
                      [path]: { ...addDraft, type: nextType },
                    }));
                  }}
                >
                  <option value='string'>string</option>
                  <option value='number'>number</option>
                  <option value='boolean'>boolean</option>
                  <option value='object'>object</option>
                  <option value='array'>array</option>
                  <option value='null'>null</option>
                </select>

                <input
                  type='text'
                  placeholder='value (true/false for boolean)'
                  value={addDraft.value}
                  disabled={
                    addDraft.type === 'object' ||
                    addDraft.type === 'array' ||
                    addDraft.type === 'null'
                  }
                  className='w-full rounded-lg border border-gray-300 bg-white p-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900'
                  onChange={(e) => {
                    const next = e.target.value;
                    setAddFieldDrafts((prev) => ({
                      ...prev,
                      [path]: { ...addDraft, value: next },
                    }));
                  }}
                />

                <button
                  type='button'
                  className='rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700'
                  onClick={() => addFieldToObject(path)}
                >
                  Add Field
                </button>
              </div>

              {selectedSuggestion && (
                <div className='mt-2 rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'>
                  <div className='font-medium'>
                    {selectedSuggestion.metadata.label ??
                      selectedSuggestion.key}
                  </div>
                  {selectedSuggestion.metadata.description && (
                    <div>{selectedSuggestion.metadata.description}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {readOnly && (
            <div className='mt-2 text-xs text-amber-600 dark:text-amber-400'>
              This section is read-only.
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'boolean') {
      const metadata = getFieldMetadata(path);
      const defaultValue = getFieldDefault(path);

      return (
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={value}
                disabled={readOnly}
                onChange={(e) => setConfigValueByPath(path, e.target.checked)}
              />
              <span className='font-medium'>{metadata?.label || keyName}</span>
              {readOnly && (
                <span className='text-xs text-amber-600 dark:text-amber-400'>
                  read-only
                </span>
              )}
            </label>
            {defaultValue !== undefined && !readOnly && (
              <button
                type='button'
                onClick={() => setConfigValueByPath(path, defaultValue)}
                className='text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1'
                title='Auto-fill with default value'
              >
                <Zap className='w-3 h-3' />
                Default
              </button>
            )}
          </div>
          {metadata?.description && (
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              {metadata.description}
            </p>
          )}
        </div>
      );
    }

    if (typeof value === 'number') {
      const metadata = getFieldMetadata(path);
      const defaultValue = getFieldDefault(path);

      return (
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <label className='flex flex-col gap-1 text-sm flex-1'>
              <span className='font-medium'>{metadata?.label || keyName}</span>
              <input
                type='number'
                value={Number.isFinite(value) ? value : 0}
                min={metadata?.min}
                max={metadata?.max}
                disabled={readOnly}
                className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 disabled:opacity-70'
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isNaN(next)) {
                    setConfigValueByPath(path, next);
                  }
                }}
              />
            </label>
            {defaultValue !== undefined && !readOnly && (
              <button
                type='button'
                onClick={() => setConfigValueByPath(path, defaultValue)}
                className='text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1 ml-2 h-fit'
                title='Auto-fill with default value'
              >
                <Zap className='w-3 h-3' />
              </button>
            )}
          </div>
          {readOnly && (
            <span className='text-xs text-amber-600 dark:text-amber-400'>
              Read-only field
            </span>
          )}
          {metadata?.description && (
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              {metadata.description}
            </p>
          )}
        </div>
      );
    }

    // Check if this field has select options
    const fieldOptions = getFieldOptions(path);
    if (fieldOptions && fieldOptions.length > 0) {
      const metadata = getFieldMetadata(path);
      const defaultValue = getFieldDefault(path);

      return (
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <label className='flex flex-col gap-1 text-sm flex-1'>
              <span className='font-medium'>{metadata?.label || keyName}</span>
              <select
                value={String(value)}
                disabled={readOnly}
                className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 disabled:opacity-70'
                onChange={(e) => {
                  const newValue = fieldOptions.find(
                    (opt) => String(opt.value) === e.target.value,
                  )?.value;
                  if (newValue !== undefined) {
                    setConfigValueByPath(path, newValue);
                  }
                }}
              >
                {fieldOptions.map((option) => (
                  <option
                    key={String(option.value)}
                    value={String(option.value)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {defaultValue !== undefined && !readOnly && (
              <button
                type='button'
                onClick={() => setConfigValueByPath(path, defaultValue)}
                className='text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1 ml-2 h-fit'
                title='Auto-fill with default value'
              >
                <Zap className='w-3 h-3' />
              </button>
            )}
          </div>
          {readOnly && (
            <span className='text-xs text-amber-600 dark:text-amber-400'>
              Read-only field
            </span>
          )}
          {metadata?.description && (
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              {metadata.description}
            </p>
          )}
        </div>
      );
    }

    // Default string/text input
    const strValue = value ?? '';
    const isMultiline = typeof strValue === 'string' && strValue.includes('\n');
    const metadata = getFieldMetadata(path);
    const defaultValue = getFieldDefault(path);

    return (
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <label className='flex flex-col gap-1 text-sm flex-1'>
            <span className='font-medium'>{metadata?.label || keyName}</span>
            {isMultiline ? (
              <textarea
                rows={4}
                value={String(strValue)}
                disabled={readOnly}
                placeholder={metadata?.placeholder}
                className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 disabled:opacity-70'
                onChange={(e) => setConfigValueByPath(path, e.target.value)}
              />
            ) : (
              <input
                type='text'
                value={String(strValue)}
                disabled={readOnly}
                placeholder={metadata?.placeholder}
                className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 disabled:opacity-70'
                onChange={(e) => setConfigValueByPath(path, e.target.value)}
              />
            )}
          </label>
          {defaultValue !== undefined && !readOnly && (
            <button
              type='button'
              onClick={() => setConfigValueByPath(path, defaultValue)}
              className='text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center gap-1 ml-2 h-fit'
              title='Auto-fill with default value'
            >
              <Zap className='w-3 h-3' />
            </button>
          )}
        </div>
        {readOnly && (
          <span className='text-xs text-amber-600 dark:text-amber-400'>
            Read-only field
          </span>
        )}
        {metadata?.description && (
          <p className='text-xs text-gray-600 dark:text-gray-400'>
            {metadata.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-row items-center justify-between'>
        <h3 className='text-lg font-semibold flex flex-row items-center gap-2'>
          <Server className='w-5 h-5' />
          Gate Proxy Server
        </h3>
        <button
          onClick={fetchGateStatus}
          className='p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-800 cursor-pointer transition-colors'
          title='Refresh status'
        >
          <RefreshCw className='w-4 h-4' />
        </button>
      </div>

      {gateStatus && (
        <div className='grid grid-cols-2 gap-4'>
          <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
            <div className='flex flex-row items-center gap-2 mb-2'>
              <Activity className='w-4 h-4' />
              <span className='text-sm font-medium'>Status</span>
            </div>
            <div className='flex flex-row items-center gap-2'>
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className='text-lg font-semibold'>{getStatusText()}</span>
            </div>
          </div>

          <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
            <div className='text-sm font-medium mb-2'>Replicas</div>
            <div className='text-lg font-semibold'>
              {gateStatus.readyReplicas} / {gateStatus.replicas}
            </div>
          </div>
        </div>
      )}

      <div className='flex flex-row gap-2'>
        <button
          onClick={handleRestart}
          disabled={isLoading || isSaving}
          className='flex flex-row items-center gap-2 p-2 bg-yellow-500 hover:bg-yellow-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Restart Gate Server
        </button>

        {!isEditingConfig ? (
          <button
            onClick={() => setIsEditingConfig(true)}
            disabled={isLoading || isSaving || editableConfig === null}
            className='flex flex-row items-center gap-2 p-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Edit3 className='w-4 h-4' />
            Edit Configuration
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveConfig}
              disabled={isSaving || isLoading}
              className='flex flex-row items-center gap-2 p-2 bg-green-500 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
              Save Configuration
            </button>
            <button
              onClick={() => {
                setIsEditingConfig(false);
                if (gateConfig) {
                  setEditableConfig(deepClone(gateConfig));
                }
                setArrayDrafts({});
                setAddFieldDrafts({});
              }}
              disabled={isSaving || isLoading}
              className='p-2 bg-gray-500 hover:bg-gray-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {gateStatus?.conditions && gateStatus.conditions.length > 0 && (
        <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
          <div className='text-sm font-medium mb-2'>Conditions</div>
          <div className='space-y-1'>
            {gateStatus.conditions.map((condition, index) => (
              <div
                key={index}
                className='text-sm flex flex-row items-center gap-2'
              >
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${condition.status === 'True' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
                >
                  {condition.type}
                </span>
                <span className='text-gray-600 dark:text-gray-400'>
                  {condition.message || condition.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditingConfig && editableConfig && (
        <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
          <div className='text-sm font-medium mb-2 flex flex-row items-center justify-between'>
            <span>Configuration Form</span>
            <span className='text-xs text-orange-600 dark:text-orange-400'>
              Read-only fields: api, config.forwarding, config.bind
            </span>
          </div>

          <div className='space-y-4'>
            {Object.entries(editableConfig as JsonObject).map(
              ([key, value]) => (
                <div key={key}>
                  {renderValueEditor(key, value as JsonValue, key)}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
