interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="p-3 border-b border-gray-800">
      <input
        type="text"
        placeholder="Search sessions..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 text-sm
                   placeholder-gray-500 border border-gray-700 focus:border-blue-500
                   focus:outline-none transition-colors"
      />
    </div>
  );
}
