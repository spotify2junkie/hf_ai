import React, { useState } from 'react';
import { SearchResponse, SearchResult, Paper } from '../types';
import PapersTable from './PapersTable';
import Pagination from './Pagination';
import AIInterpretationModal from './AIInterpretationModal';

interface SearchResultsProps {
  searchResponse: SearchResponse;
  onPageChange: (page: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResponse,
  onPageChange,
  onPrevious,
  onNext,
}) => {
  const { query, results, pagination, searchMetadata } = searchResponse;
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAIInterpretation = (paper: Paper) => {
    setSelectedPaper(paper);
    setIsModalOpen(true);
  };

  // Format execution time
  const executionTime = searchMetadata.executionTime < 1
    ? `${Math.round(searchMetadata.executionTime * 1000)}ms`
    : `${searchMetadata.executionTime.toFixed(2)}s`;

  // Empty state
  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Search Results for "{query}"
          </h2>
        </div>
        <div className="p-12 text-center">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No papers found
          </h3>
          <p className="text-gray-600 mb-4">
            Try different keywords or check your spelling
          </p>
          <div className="text-sm text-gray-500">
            <p>Searched through {searchMetadata.searchedPapers.toLocaleString()} papers</p>
            <p className="mt-1">Search completed in {executionTime}</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert SearchResult[] to Paper[] for PapersTable (strip score)
  const papers = results.map(({ score, ...paper }) => paper);

  return (
    <>
      <AIInterpretationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        paper={selectedPaper}
      />

      <div className="bg-white rounded-lg shadow">
        {/* Header with results count */}
        <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Found {pagination.totalResults.toLocaleString()} papers matching "{query}"
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Searched through {searchMetadata.searchedPapers.toLocaleString()} papers in {executionTime}
            </p>
          </div>

          {/* Search metadata badge */}
          <div className="mt-3 sm:mt-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Match threshold: {Math.round(searchMetadata.threshold * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Results table with score badges */}
      <div className="relative">
        {/* Render papers with score indicators */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relevance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paper
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Authors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => {
                const paper = papers[index];
                const score = Math.round(result.score);

                // Color based on score
                const scoreColor =
                  score >= 80 ? 'bg-green-100 text-green-800' :
                  score >= 60 ? 'bg-blue-100 text-blue-800' :
                  score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800';

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    {/* Score badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${scoreColor}`}
                          title={`Match score: ${score}%`}
                        >
                          {score}%
                        </span>
                      </div>
                    </td>

                    {/* Paper details - show inline */}
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {paper.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {paper.abstract}
                        </p>
                      </div>
                    </td>

                    {/* Authors */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {paper.authors.length > 0
                          ? paper.authors.length <= 2
                            ? paper.authors.join(', ')
                            : `${paper.authors.slice(0, 2).join(', ')} +${paper.authors.length - 2}`
                          : 'Unknown'}
                      </div>
                    </td>

                    {/* Topics */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {paper.topics.length > 0 ? (
                          paper.topics.slice(0, 2).map((topic, topicIndex) => (
                            <span
                              key={topicIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {topic}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No topics</span>
                        )}
                        {paper.topics.length > 2 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{paper.topics.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PDF Link */}
                    <td className="px-6 py-4">
                      {paper.pdf_url ? (
                        <a
                          href={paper.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">No PDF</span>
                      )}
                    </td>

                    {/* Actions - AI Interpretation */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleAIInterpretation(paper)}
                        disabled={!paper.pdf_url}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        title={paper.pdf_url ? 'AI 解读' : 'No PDF available'}
                      >
                        🤖 AI 解读
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      )}
      </div>
    </>
  );
};

export default SearchResults;
