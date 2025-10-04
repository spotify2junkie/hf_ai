import React, { useState } from 'react';
import { Paper } from '../types';

interface PapersTableProps {
  papers: Paper[];
}

const PapersTable: React.FC<PapersTableProps> = ({ papers }) => {
  const [expandedPaper, setExpandedPaper] = useState<number | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedPaper(expandedPaper === index ? null : index);
  };

  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatAuthors = (authors: string[]): string => {
    if (authors.length === 0) return 'Unknown authors';
    if (authors.length === 1) return authors[0];
    if (authors.length <= 3) return authors.join(', ');
    return `${authors.slice(0, 2).join(', ')} and ${authors.length - 2} others`;
  };

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
            {papers.map((paper, index) => (
              <React.Fragment key={index}>
                {/* Main Row */}
                <tr className={`hover:bg-gray-50 ${expandedPaper === index ? 'bg-blue-50' : ''}`}>
                  {/* Paper Title & Abstract */}
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {paper.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {expandedPaper === index
                          ? paper.abstract
                          : truncateText(paper.abstract)
                        }
                      </p>
                    </div>
                  </td>

                  {/* Authors */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {formatAuthors(paper.authors)}
                      {paper.authors.length > 3 && (
                        <span className="text-xs text-gray-500 block mt-1">
                          ({paper.authors.length} total authors)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Topics */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {paper.topics.length > 0 ? (
                        paper.topics.slice(0, 3).map((topic, topicIndex) => (
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
                      {paper.topics.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          +{paper.topics.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* PDF URL */}
                  <td className="px-6 py-4">
                    {paper.pdf_url ? (
                      <a
                        href={paper.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        📄 View PDF
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">No PDF</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleExpanded(index)}
                      className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {expandedPaper === index ? '▲ Less' : '▼ More'}
                    </button>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedPaper === index && (
                  <tr className="bg-blue-50">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="space-y-4">
                        {/* Full Author List */}
                        {paper.authors.length > 3 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              All Authors ({paper.authors.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {paper.authors.map((author, authorIndex) => (
                                <span
                                  key={authorIndex}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-800 border"
                                >
                                  {author}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* All Topics */}
                        {paper.topics.length > 3 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              All Topics ({paper.topics.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {paper.topics.map((topic, topicIndex) => (
                                <span
                                  key={topicIndex}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Paper Info */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Paper Information
                          </h4>
                          <div className="bg-white rounded-md p-3 text-sm text-gray-600">
                            <div><strong>Published:</strong> {paper.published_date}</div>
                            {paper.pdf_url && (
                              <div className="mt-1">
                                <strong>PDF URL:</strong>{' '}
                                <a
                                  href={paper.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 break-all"
                                >
                                  {paper.pdf_url}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile-friendly card view for small screens */}
      <div className="sm:hidden">
        <div className="space-y-4 p-4">
          {papers.map((paper, index) => (
            <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{paper.title}</h3>
              <p className="text-sm text-gray-600 mb-3">
                {truncateText(paper.abstract, 100)}
              </p>

              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Authors: </span>
                  <span className="text-xs text-gray-700">{formatAuthors(paper.authors)}</span>
                </div>

                {paper.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {paper.topics.slice(0, 2).map((topic, topicIndex) => (
                      <span
                        key={topicIndex}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {paper.pdf_url && (
                  <div className="mt-3">
                    <a
                      href={paper.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      📄 View PDF
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PapersTable;