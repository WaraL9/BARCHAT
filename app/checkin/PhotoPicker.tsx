"use client";

import { useCallback, useRef, useState, DragEvent, ChangeEvent } from "react";

// --- Pure validation function ---

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates that a file is an accepted image type and within size limits.
 * Pure function — no side effects.
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPEG, PNG, and WebP images are accepted." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "Image must be under 5 MB." };
  }
  return { valid: true };
}

// --- Base64 conversion function ---

/**
 * Converts a File to a base64 data URL string.
 */
export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// --- PhotoPicker Component ---

export interface PhotoPickerProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  error?: string | null;
}

export default function PhotoPicker({ value, onChange, error: externalError }: PhotoPickerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = externalError || validationError;

  const processFile = useCallback(
    async (file: File) => {
      const result = validateImageFile(file);
      if (!result.valid) {
        setValidationError(result.error ?? "Invalid file.");
        return;
      }

      setValidationError(null);
      try {
        const dataUrl = await fileToBase64DataUrl(file);
        onChange(dataUrl);
      } catch {
        setValidationError("Failed to read the image file.");
      }
    },
    [onChange]
  );

  /**
   * From a list of files (e.g. multi-file drop), find the first valid image.
   * If none are valid, show an error for the first file attempted.
   */
  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Find the first valid image
      for (const file of fileArray) {
        const result = validateImageFile(file);
        if (result.valid) {
          processFile(file);
          return;
        }
      }

      // No valid file found — show error for the first file
      const firstResult = validateImageFile(fileArray[0]);
      setValidationError(firstResult.error ?? "Invalid file.");
    },
    [processFile]
  );

  // --- Drag event handlers ---

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  // --- Click/tap handler ---

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [processFile]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="Photo picker. Tap or drag an image to upload."
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-200 overflow-hidden
          ${isDragOver
            ? "border-4 border-dashed border-purple-400 bg-purple-900/30"
            : "border-2 border-gray-600 bg-gray-800 hover:border-purple-500"
          }
        `}
      >
        {value ? (
          <img
            src={value}
            alt="Selected photo preview"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-2">
            {/* Placeholder avatar icon */}
            <svg
              className="w-10 h-10 text-gray-400 mb-1"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            <span className="text-xs text-gray-400">Tap or drag photo</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Error message */}
      {displayError && (
        <p className="text-red-400 text-xs text-center" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
