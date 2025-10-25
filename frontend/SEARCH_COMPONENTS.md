# Search Components Documentation

## Overview

The search functionality allows users to perform fuzzy search on academic papers stored in the database. The implementation includes debounced input, pagination, and seamless integration with existing features.

## Components

### 1. SearchBar Component
**Location:** `/src/components/SearchBar.tsx`

A search input component with debouncing and validation.

#### Features:
- **Debounced Search**: 500ms delay to reduce API calls
- **Minimum 2 Characters**: Validates input length before search
- **Loading State**: Shows spinner during search
- **Clear Button**: Quickly reset search
- **Keyboard Support**: Enter key to trigger immediate search
- **Accessible**: ARIA labels and error messaging

#### Props:
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;     // Callback when search is triggered
  onClear: () => void;                   // Callback when clear is clicked
  isLoading: boolean;                    // Loading state indicator
  disabled?: boolean;                    // Disable input
  initialValue?: string;                 // Pre-populate search
}
```

#### Usage:
```tsx
<SearchBar
  onSearch={handleSearch}
  onClear={handleClearSearch}
  isLoading={isSearching}
  disabled={false}
/>
```

---

### 2. Pagination Component
**Location:** `/src/components/Pagination.tsx`

Pagination controls with keyboard navigation.

#### Features:
- **Page Numbers**: Shows up to 5 page buttons
- **Previous/Next**: Navigation buttons
- **Result Count**: Displays "Showing X to Y of Z results"
- **Keyboard Navigation**: Arrow keys to navigate pages
- **Responsive**: Mobile and desktop layouts
- **Ellipsis**: Smart page number display with ellipsis

#### Props:
```typescript
interface PaginationProps {
  pagination: SearchPagination;          // Pagination metadata
  onPageChange: (page: number) => void;  // Navigate to specific page
  onPrevious: () => void;                // Go to previous page
  onNext: () => void;                    // Go to next page
}
```

#### Usage:
```tsx
<Pagination
  pagination={searchResponse.pagination}
  onPageChange={goToPage}
  onPrevious={previousPage}
  onNext={nextPage}
/>
```

---

### 3. SearchResults Component
**Location:** `/src/components/SearchResults.tsx`

Displays search results with relevance scores and pagination.

#### Features:
- **Relevance Scores**: Color-coded match scores (0-100%)
- **AI Interpretation**: Integrates with AI modal
- **Search Metadata**: Shows execution time and papers searched
- **Empty State**: User-friendly no results message
- **Pagination**: Integrated pagination controls
- **Table Layout**: Consistent with PapersTable design

#### Props:
```typescript
interface SearchResultsProps {
  searchResponse: SearchResponse;        // Search results data
  onPageChange: (page: number) => void;  // Page navigation
  onPrevious: () => void;                // Previous page
  onNext: () => void;                    // Next page
}
```

#### Usage:
```tsx
<SearchResults
  searchResponse={searchResponse}
  onPageChange={goToPage}
  onPrevious={previousPage}
  onNext={nextPage}
/>
```

---

### 4. useSearch Hook
**Location:** `/src/hooks/useSearch.ts`

Custom React hook for managing search state and operations.

#### Features:
- **State Management**: Centralized search state
- **API Integration**: Calls search API
- **Pagination Logic**: Page navigation methods
- **Error Handling**: Catches and reports errors
- **Loading States**: Tracks API call status

#### Return Values:
```typescript
interface UseSearchResult {
  searchResponse: SearchResponse | null; // Search results
  isLoading: boolean;                    // Loading indicator
  error: string | null;                  // Error message
  searchQuery: string;                   // Current query
  currentPage: number;                   // Current page number
  performSearch: (query: string, page?: number) => Promise<void>;
  clearSearch: () => void;               // Reset search
  goToPage: (page: number) => void;      // Navigate to page
  nextPage: () => void;                  // Next page
  previousPage: () => void;              // Previous page
}
```

#### Usage:
```tsx
const {
  searchResponse,
  isLoading,
  error,
  performSearch,
  clearSearch,
  goToPage,
  nextPage,
  previousPage,
} = useSearch(10); // 10 results per page
```

---

## Type Definitions

### SearchResult
Extends Paper with relevance score:
```typescript
interface SearchResult extends Paper {
  score: number; // Match score 0-100
}
```

### SearchPagination
```typescript
interface SearchPagination {
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### SearchMetadata
```typescript
interface SearchMetadata {
  executionTime: number;   // Search time in seconds
  searchedPapers: number;  // Total papers searched
  threshold: number;       // Match threshold (0-1)
}
```

### SearchResponse
```typescript
interface SearchResponse {
  query: string;
  results: SearchResult[];
  pagination: SearchPagination;
  searchMetadata: SearchMetadata;
}
```

---

## Integration with App.tsx

The main App component integrates search functionality:

```tsx
function App() {
  // Search hook
  const {
    searchResponse,
    isLoading: isSearching,
    error: searchError,
    performSearch,
    clearSearch,
    goToPage,
    nextPage,
    previousPage,
  } = useSearch();

  // Handle search
  const handleSearch = (query: string) => {
    setPapers([]); // Clear date-based results
    performSearch(query);
  };

  // Handle clear
  const handleClearSearch = () => {
    clearSearch();
  };

  return (
    <div>
      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearch}
        onClear={handleClearSearch}
        isLoading={isSearching}
      />

      {/* Search Results */}
      {searchResponse && (
        <SearchResults
          searchResponse={searchResponse}
          onPageChange={goToPage}
          onPrevious={previousPage}
          onNext={nextPage}
        />
      )}
    </div>
  );
}
```

---

## API Endpoint

### GET `/api/search/papers`

**Query Parameters:**
- `q` (required): Search query string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response:**
```typescript
{
  query: string;
  results: SearchResult[];
  pagination: SearchPagination;
  searchMetadata: SearchMetadata;
}
```

---

## User Flow

1. **User enters search query** in SearchBar
2. **Debounce timer** waits 500ms for typing to stop
3. **Validation** checks minimum 2 characters
4. **API call** sent to `/api/search/papers`
5. **SearchResults** displays results with scores
6. **User can:**
   - Click pagination to view more results
   - Use arrow keys for keyboard navigation
   - Click "AI 解读" for AI interpretation
   - Click "View PDF" to open paper
   - Clear search to return to date browsing

---

## Styling

All components use **TailwindCSS** with consistent styling:

- **Primary color**: Blue (blue-600, blue-700)
- **Success**: Green (green-600 for AI buttons)
- **Error**: Red (red-50, red-600 for errors)
- **Score badges**:
  - Green (80-100%): Excellent match
  - Blue (60-79%): Good match
  - Yellow (40-59%): Fair match
  - Gray (0-39%): Poor match

---

## Accessibility

- **ARIA labels** on all interactive elements
- **Keyboard navigation** supported
- **Error messages** with role="alert"
- **Focus management** on clear button
- **Semantic HTML** for screen readers

---

## Performance Optimizations

1. **Debouncing**: Reduces API calls during typing
2. **React.memo**: Could be added for SearchResults
3. **Pagination**: Limits results per page
4. **Lazy loading**: Backend handles pagination efficiently

---

## Future Enhancements

- [ ] Add search suggestions/autocomplete
- [ ] Save recent searches
- [ ] Filter by topic/author
- [ ] Sort results by score/date
- [ ] Export search results
- [ ] Advanced search with operators
- [ ] Search history
