import { motion } from "framer-motion";
import React, { useState } from "react";
import { HistoryItem } from "../types";

interface HistoryTabProps {
  history: HistoryItem[];
  onCopyText: (text: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onCopyText,
  onDeleteHistoryItem,
  onClearHistory,
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Group history items by date
  const groupedHistory = history.reduce<Record<string, HistoryItem[]>>(
    (acc, item) => {
      // Use "en-US" locale for date formatting
      const date = new Date(item.timestamp).toLocaleDateString("en-US");

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(item);
      return acc;
    },
    {}
  );

  // Convert timestamp to time
  const formatTime = (timestamp: number) => {
    // Use "en-US" locale for time formatting
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Truncate text for display
  const truncateText = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Get icon based on history item type
  const getTypeIcon = (type: "translation" | "transcription") => {
    if (type === "translation") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-blue-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
          />
        </svg>
      );
    } else {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-green-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      );
    }
  };

  return (
    <div>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12 mb-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>No history yet</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <button
              onClick={onClearHistory}
              className="text-xs text-destructive hover:text-destructive/80 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              Clear history
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div
                key={date}
                className="border border rounded-md overflow-hidden"
              >
                <div className="bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                  {date}
                </div>
                <div>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border-t border px-3 py-2 hover:bg-accent"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() =>
                          setExpandedItem(
                            expandedItem === item.id ? null : item.id
                          )
                        }
                      >
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(item.type)}
                          <span className="text-sm font-medium">
                            {truncateText(item.originalText)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(item.timestamp)}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className={`w-4 h-4 transition-transform ${
                              expandedItem === item.id
                                ? "transform rotate-180"
                                : ""
                            }`}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                            />
                          </svg>
                        </div>
                      </div>

                      {expandedItem === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 pt-2 border-t border"
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {item.type === "translation"
                              ? `Translated from ${item.sourceLanguage} to ${item.targetLanguage}`
                              : "Transcription"}
                          </div>

                          <div className="mb-2">
                            <div className="text-xs font-medium text-foreground mb-1">
                              Original text:
                            </div>
                            <div className="p-2 bg-muted/50 rounded text-sm border border">
                              {item.originalText}
                            </div>
                          </div>

                          <div className="mb-2">
                            <div className="text-xs font-medium text-foreground mb-1">
                              {item.type === "translation"
                                ? "Translation:"
                                : "Transcribed text:"}
                            </div>
                            <div className="p-2 bg-muted/50 rounded text-sm border border">
                              {item.translatedText}
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => onCopyText(item.translatedText)}
                              className="text-xs text-primary hover:text-primary/80 flex items-center"
                              title="Copy"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-4 h-4 mr-1"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                                />
                              </svg>
                              Copy
                            </button>
                            <button
                              onClick={() => onDeleteHistoryItem(item.id)}
                              className="text-xs text-destructive hover:text-destructive/80 flex items-center"
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-4 h-4 mr-1"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryTab;
