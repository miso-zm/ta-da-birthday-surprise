"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import styles from "./mobile-picker.module.css";

export type MobilePickerOption = {
  value: number;
  label: string;
};

export type MobilePickerProps = {
  label: string;
  value: number | "";
  options: MobilePickerOption[];
  columns?: 3 | 5;
  disabled?: boolean;
  disabledText?: string;
  onChange: (value: number) => void;
};

export function MobilePicker({
  label,
  value,
  options,
  columns = 3,
  disabled = false,
  disabledText = "暂不可选",
  onChange,
}: MobilePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  function closePicker() {
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector<HTMLButtonElement>(
        '[data-selected="true"]',
      );
      const firstOption = dialogRef.current?.querySelector<HTMLButtonElement>(
        '[data-picker-option="true"]',
      );
      (preferred ?? firstOption)?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closePicker();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <span className={selectedOption ? styles.triggerValue : styles.triggerPlaceholder}>
          {disabled ? disabledText : selectedOption?.label ?? `选择${label}`}
        </span>
        <span className={styles.triggerAction} aria-hidden="true">
          选择
        </span>
      </button>

      {isOpen ? (
        <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
          <div
            ref={dialogRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleDialogKeyDown}
          >
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.eyebrow}>生日月日</p>
                <h2 id={titleId}>选择{label}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={closePicker}>
                关闭
              </button>
            </div>

            <div
              className={styles.optionGrid}
              data-columns={columns}
              aria-label={`${label}选项`}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={selected ? styles.optionSelected : styles.option}
                    aria-pressed={selected}
                    data-picker-option="true"
                    data-selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      closePicker();
                    }}
                  >
                    <span>{option.label}</span>
                    {selected ? <small>已选择</small> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
