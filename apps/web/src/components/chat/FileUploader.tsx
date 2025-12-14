import { useRef } from 'react';

export function FileUploader(props: {
  accept: string;
  capture?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
  children: (api: { open: () => void }) => React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    if (props.disabled) return;
    inputRef.current?.click();
  };

  return (
    <>
      {props.children({ open })}
      <input
        ref={inputRef}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        capture={props.capture as any}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          props.onFile(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
