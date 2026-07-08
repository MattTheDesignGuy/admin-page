import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { UploadCloud, FileText } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Dropzone({
  onFileSelected,
  accept,
  disabled,
}: {
  onFileSelected: (file: File) => void
  accept: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setFileName(file.name)
    onFileSelected(file)
  }

  return (
    <div
      onDragOver={(e: DragEvent) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors duration-[180ms] ease-out',
        dragging ? 'border-indigo bg-indigo/5' : 'border-hairline bg-surface-sunken',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
      />
      {fileName ? (
        <>
          <FileText size={28} className="text-indigo" />
          <p className="text-sm font-medium text-ink">{fileName}</p>
          <p className="text-xs text-ink-faint">Click to choose a different file</p>
        </>
      ) : (
        <>
          <UploadCloud size={28} className="text-ink-faint" />
          <p className="text-sm font-medium text-ink">Drop a file here, or click to browse</p>
          <p className="text-xs text-ink-faint">PDF, JPG, or PNG — up to 15MB</p>
        </>
      )}
    </div>
  )
}
