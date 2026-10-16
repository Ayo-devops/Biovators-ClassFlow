import Icon from "./icon";

export default function FilePicker({ id, files = [], multiple = false, accept, onChange }) {
  const selected = Array.from(files || []);
  const status = selected.length === 0
    ? "No file chosen"
    : selected.length === 1
      ? selected[0].name
      : `${selected.length} files selected`;

  return (
    <label className={`file-picker${selected.length ? " has-file" : ""}`} htmlFor={id}>
      <input id={id} type="file" multiple={multiple} accept={accept} onChange={onChange} />
      <span className="file-picker-button"><Icon name="upload" size={16} />Choose file{multiple ? "s" : ""}</span>
      <span className="file-picker-status">{status}</span>
    </label>
  );
}
