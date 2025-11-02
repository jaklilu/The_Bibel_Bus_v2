import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, MessageSquare } from "lucide-react";

interface ReflectionEntry {
  name: string;
  date: string;
  verse: string;
  reflection: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // fallback
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Reflections: React.FC = () => {
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReflections = async () => {
      try {
        const SHEET_URL =
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7U9IR3YSKWJXKKLROXUw3e4ciw_PeLVevtD1ykxsE9mkk05r_G547ufITJW_idnNSo0tpX9MfZgqs/pub?output=csv";

        const res = await fetch(SHEET_URL);
        const text = await res.text();

        // Split CSV into lines and remove header
        const rows = text.split("\n").slice(1);

        // Parse rows manually (safe CSV)
        const parsed: ReflectionEntry[] = rows
          .map((line) => {
            const cols = line.split(",");
            const [name, date, verse, ...reflectionParts] = cols;
            const reflection = reflectionParts.join(",").trim();
            return {
              name: name?.trim() || "",
              date: date?.trim() || "",
              verse: verse?.trim() || "",
              reflection: reflection || "",
            };
          })
          .filter((r) => r.name && r.reflection); // skip empty rows

        // Sort by date (newest first)
        parsed.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
          <div className="space-y-6">
            {reflections.map((r, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-white font-semibold">{r.name}</p>
                  <span className="text-purple-300 text-sm">
                    {formatDate(r.date)}
                  </span>
                </div>

                {r.verse && (
                  <p className="text-amber-300 italic mb-2">{r.verse}</p>
                )}

                <div className="text-purple-100 leading-relaxed whitespace-pre-wrap">
                  {r.reflection}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reflections;
