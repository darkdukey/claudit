interface Props {
  value: string;
  onChange: (v: string) => void;
  contentMode: boolean;
  onToggleContentMode: () => void;
}

export default function SearchBar({ value, onChange, contentMode, onToggleContentMode }: Props) {
  return (
    <div className="p-3 border-b border-gray-800">
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          data-search-input
          placeholder={contentMode ? 'Search session content...' : 'Search sessions...'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 text-sm
                     placeholder-gray-500 border border-gray-700 focus:border-blue-500
                     focus:outline-none transition-colors"
        />
        <button
          onClick={onToggleContentMode}
          title={contentMode ? 'Search by name' : 'Search content'}
          className={`flex-shrink-0 p-1.5 rounded transition-colors ${
            contentMode
              ? 'bg-claude text-white'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
