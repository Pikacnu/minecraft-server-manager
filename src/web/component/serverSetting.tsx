import {
  FIELD_DEFINITIONS,
  FIELDS_BY_CATEGORY,
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  useRef,
} from 'react';

const defaultSelectedFields = ['version', 'memoryLimit', 'type', 'SERVER_NAME'];

export default function ServerSetting({
  open = false,
  isToggleAble = true,
  setSetting,
  defaultValue,
}: {
  isToggleAble?: boolean;
  open: boolean;
  setSetting: Dispatch<
    SetStateAction<
      Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> &
        Variables
    >
  >;
  defaultValue?: Partial<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> &
      Variables & { serverSettingId: string }
  >;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    Object.fromEntries(
      FIELD_DEFINITIONS.map((field) => [
        field.key,
        defaultValue && field.key in defaultValue
          ? (defaultValue as Record<string, any>)[field.key]
          : (field.defaultValue ??
            (defaultSelectedFields.includes(field.key) ? field.example : '')),
      ]),
    ),
  );
  const [isOpen, setIsOpen] = useState<boolean>(open);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Deployment']),
  );

  const previousServerSettingId = useRef('');

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (
      defaultValue &&
      defaultValue.serverSettingId !== previousServerSettingId.current
    ) {
      setFieldValues(defaultValue as Record<string, string>);
      previousServerSettingId.current = defaultValue.serverSettingId!;
    }
  }, [defaultValue]);

  useEffect(() => {
    setSetting((prev) => ({
      ...prev,
      ...fieldValues,
    }));
  }, [fieldValues, setSetting]);

  const MainComponent = (
    <div className='w-full overflow-y-auto rounded-lg bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60 md:p-4 h-auto'>
      {FIELDS_BY_CATEGORY.map(([category, fields]) => (
        <div
          key={category}
          className='mb-4 overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
        >
          <button
            className='flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700'
            onClick={() => toggleCategory(category)}
          >
            <span className='text-base font-semibold md:text-lg'>
              {category}
            </span>
            {expandedCategories.has(category) ? (
              <ChevronUp className='w-5 h-5' />
            ) : (
              <ChevronDown className='w-5 h-5' />
            )}
          </button>
          {expandedCategories.has(category) && (
            <div className='grid grid-cols-1 gap-4 border-t border-gray-300 p-4 dark:border-gray-700 md:grid-cols-2 xl:grid-cols-3'>
              {fields.map((fieldDef) => {
                const fieldKey = fieldDef.key;
                return (
                  <div
                    key={fieldKey}
                    className='flex flex-col gap-1'
                  >
                    <label
                      htmlFor={fieldKey}
                      className='text-sm font-medium'
                    >
                      {fieldDef.key}
                    </label>
                    {((def) => {
                      switch (def.type) {
                        case 'string':
                        case 'number':
                          return (
                            <input
                              type={def.type === 'number' ? 'number' : 'text'}
                              id={def.key}
                              disabled={def.readonly && isToggleAble}
                              placeholder={def.example}
                              className='rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500'
                              value={fieldValues[def.key] || ''}
                              onChange={(e) =>
                                setFieldValues({
                                  ...fieldValues,
                                  [def.key]: e.target.value,
                                })
                              }
                            ></input>
                          );
                        case 'boolean':
                          return (
                            <select
                              id={def.key}
                              className='rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-800'
                              value={fieldValues[def.key] || 'true'}
                              disabled={def.readonly && isToggleAble}
                              onChange={(e) =>
                                setFieldValues({
                                  ...fieldValues,
                                  [def.key]: e.target.value,
                                })
                              }
                            >
                              <option value='true'>True</option>
                              <option value='false'>False</option>
                            </select>
                          );
                        case 'enum':
                          return (
                            <select
                              id={def.key}
                              className='rounded-lg border border-gray-300 bg-white p-2 text-sm dark:border-gray-600 dark:bg-gray-800'
                              value={fieldValues[def.key] || def.example}
                              disabled={def.readonly && isToggleAble}
                              onChange={(e) =>
                                setFieldValues({
                                  ...fieldValues,
                                  [def.key]: e.target.value,
                                })
                              }
                            >
                              {def.options?.map((option) => (
                                <option
                                  key={option}
                                  value={option}
                                >
                                  {option}
                                </option>
                              ))}
                            </select>
                          );
                        default:
                          return null;
                      }
                    })(fieldDef)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className='flex w-full flex-col rounded-xl border border-gray-300 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 h-full'>
      {!isToggleAble ? (
        MainComponent
      ) : !isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className='flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700'
        >
          <ChevronDown /> Server Settings
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(false)}
            className='flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <ChevronUp /> Server Settings
          </button>
          {MainComponent}
        </>
      )}
    </div>
  );
}
