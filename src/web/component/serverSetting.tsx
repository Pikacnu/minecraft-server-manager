import {
  FIELD_DEFINITIONS,
  FIELDS_BY_CATEGORY,
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';
import { ChevronDown, ChevronUp, CircleX } from 'lucide-react';
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
  const [selectedFields, setSelectedFields] = useState<string[]>(
    defaultSelectedFields,
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    Object.fromEntries(
      FIELD_DEFINITIONS.map((field) => [
        field.key,
        defaultSelectedFields.includes(field.key) &&
        !(field.key in (defaultValue || {}))
          ? field.example
          : '',
      ]),
    ),
  );
  const handleAddField = (fieldKey: string) => {
    if (!selectedFields.includes(fieldKey)) {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };
  const [isOpen, setIsOpen] = useState<boolean>(open);

  const previousServerSettingId = useRef('');

  useEffect(() => {
    if (
      defaultValue &&
      defaultValue.serverSettingId !== previousServerSettingId.current
    ) {
      setSelectedFields(
        Object.entries(defaultValue)
          .map(([key, value]) => (value ? key : ''))
          .filter((key) => !['serverSettingId'].includes(key) && key !== ''),
      );
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
    <div className='flex flex-col w-full border border-gray-300 rounded-lg p-4 bg-gray-500/40 grow'>
      <div className='flex flex-row w-full'>
        <input
          className='grow border border-gray-300 rounded-lg p-2 bg-white dark:bg-gray-800'
          name='addCategory'
          id='addCategory'
          list='fieldOptions'
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddField((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
        ></input>
        <datalist id='fieldOptions'>
          {FIELDS_BY_CATEGORY.map(([category, fields]) => (
            <optgroup
              key={category}
              label={category}
            >
              {fields.map((field) => {
                if (selectedFields.includes(field.key)) return null;
                return (
                  <option
                    key={field.key}
                    value={field.key}
                  >
                    {field.example} ({field.type})
                  </option>
                );
              })}
            </optgroup>
          ))}
        </datalist>
        <button
          className='ml-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600'
          onClick={() => {
            const input = document.getElementById(
              'addCategory',
            ) as HTMLInputElement;
            handleAddField(input.value);
            input.value = '';
          }}
        >
          Add Field
        </button>
      </div>
      {selectedFields.length === 0 ? (
        <div className='mt-4 text-gray-500'>No fields selected.</div>
      ) : (
        <div className='mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grow overflow-y-auto'>
          {selectedFields.map((fieldKey) => {
            const fieldDef = FIELD_DEFINITIONS.find(
              (field) => field.key === fieldKey,
            );
            if (!fieldDef) return null;
            return (
              <div
                key={fieldKey}
                className='flex flex-col'
              >
                <label
                  htmlFor={fieldKey}
                  className='font-semibold mb-1'
                >
                  {fieldDef.key} <sub>({fieldDef.type})</sub>
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
                          className='border border-gray-300 rounded-lg p-2 bg-white dark:bg-gray-800 placeholder:text-gray-200/40'
                          value={fieldValues[def.key]}
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
                          className='border border-gray-300 rounded-lg p-2 bg-white dark:bg-gray-800'
                          value={fieldValues[def.key]}
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
                          className='border border-gray-300 rounded-lg p-2 bg-white dark:bg-gray-800'
                          value={fieldValues[def.key]}
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
                {defaultSelectedFields.includes(fieldKey) ||
                (fieldDef.readonly && isToggleAble) ? null : (
                  <button
                    className='mt-2 p-1 bg-red-500 hover:bg-red-600 text-white flex flex-row items-center gap-2 rounded-md justify-center'
                    onClick={() => {
                      setSelectedFields(
                        selectedFields.filter((key) => key !== fieldKey),
                      );
                      const updatedValues = { ...fieldValues };
                      delete updatedValues[fieldKey];
                      setFieldValues(updatedValues);
                    }}
                  >
                    <CircleX /> Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className='grow flex flex-col bg-blue-400/40 w-full p-2 rounded-xl'>
      {!isToggleAble ? (
        MainComponent
      ) : !isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className=' self-start p-4 w-full flex gap-2'
        >
          <ChevronDown /> Server Settings
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(false)}
            className='p-4 w-full flex gap-2'
          >
            <ChevronUp /> Server Settings
          </button>
          {MainComponent}
        </>
      )}
    </div>
  );
}
