import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, MessageSquare } from "lucide-react";

interface ReflectionEntry {
  name: string;
  date: string;
  verse: string;
  reflection: string;
}

const parseDateSafe = (raw: string): Date => {
  const cleaned = raw?.trim().replace(/"/g, "") || "";
  if (!cleaned) return new Date("1900-01-01");

  // "Month Day, Year" or "Month Day" (e.g. December 31, 2025, January 1, 2026)
  const textParts = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?/);
  if (textParts) {
    const [, month, day, year] = textParts;
    // Only use fallback when year is missing; use parsed year otherwise (don't default to current year)
    const fixedYear = year || "2025";
    const d = new Date(`${month} ${day}, ${fixedYear}`);
    if (!isNaN(d.getTime())) return d;
  }

  // ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }

  // US numeric M/D/YYYY or MM/DD/YYYY
  const numericMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numericMatch) {
    const [, month, day, year] = numericMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d.getTime())) return d;
  }

  return new Date("1900-01-01");
};

const formatDate = (dateString: string): string => {
  const d = parseDateSafe(dateString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Reflections: React.FC = () => {
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");

  const uniqueNames = useMemo(() => {
    return Array.from(
      new Set(reflections.map((r) => r.name.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [reflections]);

  const filteredReflections = useMemo(() => {
    const q = nameFilter.trim().toLowerCase();
    if (!q) return reflections;
    return reflections.filter(
      (r) => r.name.trim().toLowerCase() === q
    );
  }, [reflections, nameFilter]);

  useEffect(() => {
    const fetchReflections = async () => {
      try {
        const SHEET_URL =
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7U9IR3YSKWJXKKLROXUw3e4ciw_PeLVevtD1ykxsE9mkk05r_G547ufITJW_idnNSo0tpX9MfZgqs/pub?output=csv";

        const res = await fetch(`${SHEET_URL}&_=${Date.now()}`);
        const text = await res.text();
        const rows = text.split("\n").slice(1);

        const parsed: ReflectionEntry[] = rows
          .map((line) => {
            const cols = line.split(",");
            let [name, date, ...rest] = cols;
            // CSV split breaks "Month Day, Year" into date="Month Day", rest[0]=" Year" (or " Year") - merge year back
            if (rest.length > 0 && !/\d{4}/.test(date)) {
              const possibleYear = rest[0].trim().replace(/^["']|["']$/g, "");
              if (/^\d{4}$/.test(possibleYear)) {
                date = `${date}, ${possibleYear}`.trim();
                rest = rest.slice(1);
              }
            }
            let combined = rest.join(",").trim();

            // Remove any "2025" artifacts
            combined = combined.replace(/"?2025"?/g, "").trim();

            // Extract verse before "Day"
            let verse = "";
            let reflection = combined;
            const dayIndex = combined.indexOf("Day");
            if (dayIndex > 0) {
              verse = combined
                .substring(0, dayIndex)
                .trim()
                .replace(/^["',]+|["',]+$/g, "");
              reflection = combined.substring(dayIndex).trim();
            }

            return {
              name: name?.trim() || "",
              date: date?.trim() || "",
              verse,
              reflection,
            };
          })
          .filter((r) => r.name && r.reflection);

        // Sort by newest date first
        parsed.sort(
          (a, b) =>
            parseDateSafe(b.date).getTime() - parseDateSafe(a.date).getTime()
        );

        setReflections(parsed);
      } catch (error) {
        console.error("Error fetching reflections CSV:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReflections();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-amber-400 mr-3" />
            <h1 className="text-4xl font-heading text-white">
              Daily Reflections
            </h1>
          </div>
          <p className="text-purple-200 text-lg">
            Shared thoughts and insights from our Bible reading journey
          </p>
        </motion.div>

        {/* Loading or Empty */}
        {loading ? (
          <div className="text-center text-white py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
            <p>Loading reflections...</p>
          </div>
        ) : reflections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30 text-center"
          >
            <MessageSquare className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <p className="text-purple-200 text-lg">No reflections shared yet</p>
            <p className="text-purple-300 text-sm mt-2">
              Check back soon for insights from our reading community
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-6 bg-purple-800/50 backdrop-blur-sm rounded-2xl p-5 border border-purple-700/30">
              <label
                htmlFor="reflection-name-filter"
                className="block text-sm font-medium text-purple-200 mb-2"
              >
                Filter by name
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  id="reflection-name-filter"
                  type="text"
                  list="reflection-author-names"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Type or pick a name to see only their reflections"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-purple-900/50 border border-purple-600 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                <datalist id="reflection-author-names">
                  {uniqueNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                {nameFilter.trim() !== "" && (
                  <button
                    type="button"
                    onClick={() => setNameFilter("")}
                    className="px-4 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium whitespace-nowrap border border-purple-500/50"
                  >
                    Show everyone
                  </button>
                )}
              </div>
              <p className="text-purple-300 text-xs mt-2">
                Choose a name from the suggestions (or type it exactly) to show only that person&apos;s entries.
              </p>
            </div>

            {filteredReflections.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30 text-center"
              >
                <MessageSquare className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                <p className="text-purple-200">
                  No reflections for &quot;{nameFilter.trim()}&quot;. Try another name or clear the filter.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {filteredReflections.map((r, i) => (
                  <motion.div
                    key={`${r.name}-${r.date}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 hover:border-amber-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-white font-semibold">{r.name}</p>
                      <span className="text-purple-300 text-sm">
                        {formatDate(r.date)}
                      </span>
                    </div>

                    {r.verse && (
                      <div className="mb-4">
                        <p className="text-amber-400 font-semibold mb-1">
                          Verse:{" "}
                          <span className="text-purple-100 italic font-normal">
                            {r.verse}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="text-purple-100 leading-relaxed whitespace-pre-wrap border-t border-purple-700/30 pt-3">
                      {r.reflection}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reflections;
