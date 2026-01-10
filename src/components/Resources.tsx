import { useState } from 'react';

interface Resource {
  title: string;
  description: string;
  type: 'article' | 'video' | 'exercise' | 'book';
  duration: string;
  url: string;
  featured?: boolean;
}

// Easy to update - just edit this array
const resources: Resource[] = [
  // Featured
  {
    title: 'The Mindful Pause',
    description: 'A simple technique to create space between stimulus and response. Practice being intentional in your reactions.',
    type: 'article',
    duration: '5 min read',
    url: '#',
    featured: true,
  },
  {
    title: 'Giving Feedback That Lands',
    description: 'How to deliver constructive feedback that motivates rather than deflates.',
    type: 'video',
    duration: '10 min watch',
    url: '#',
    featured: true,
  },
  // Articles
  {
    title: 'The Art of Active Listening',
    description: 'Transform your conversations by truly hearing what others are saying.',
    type: 'article',
    duration: '6 min read',
    url: '#',
  },
  {
    title: 'Managing Energy, Not Time',
    description: 'Why sustainable performance comes from managing your energy reserves.',
    type: 'article',
    duration: '8 min read',
    url: '#',
  },
  // Videos
  {
    title: 'Leading Through Change',
    description: 'Practical strategies for guiding your team through uncertainty.',
    type: 'video',
    duration: '12 min watch',
    url: '#',
  },
  {
    title: 'Building Trust in Teams',
    description: 'The foundations of psychological safety and how to cultivate it.',
    type: 'video',
    duration: '15 min watch',
    url: '#',
  },
  // Exercises
  {
    title: 'Morning Reflection Practice',
    description: 'A 5-minute journaling exercise to start your day with intention.',
    type: 'exercise',
    duration: '5 min daily',
    url: '#',
  },
  {
    title: 'The Difficult Conversation Prep',
    description: 'A worksheet to prepare for challenging discussions with confidence.',
    type: 'exercise',
    duration: '15 min exercise',
    url: '#',
  },
  {
    title: 'Weekly Energy Audit',
    description: 'Track what gives you energy vs. what drains it over a week.',
    type: 'exercise',
    duration: '5 min daily',
    url: '#',
  },
  // Books
  {
    title: 'Radical Candor',
    description: 'Kim Scott\'s framework for caring personally while challenging directly.',
    type: 'book',
    duration: 'Book summary',
    url: '#',
  },
  {
    title: 'Essentialism',
    description: 'Greg McKeown\'s guide to doing less but better.',
    type: 'book',
    duration: 'Book summary',
    url: '#',
  },
];

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  article: { icon: '📄', label: 'Articles', color: 'blue' },
  video: { icon: '▶️', label: 'Videos', color: 'purple' },
  exercise: { icon: '✏️', label: 'Exercises', color: 'green' },
  book: { icon: '📚', label: 'Books', color: 'orange' },
};

export default function Resources() {
  const [activeType, setActiveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const featuredResources = resources.filter(r => r.featured);

  const filteredResources = resources.filter(r => {
    const matchesType = activeType === 'all' || r.type === activeType;
    const matchesSearch = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch && !r.featured;
  });

  const types = ['all', 'article', 'video', 'exercise', 'book'];

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Resources</h1>
        <p className="text-gray-500 mt-2 font-medium">Curated content to support your growth journey.</p>
      </header>

      {/* Featured Section */}
      {activeType === 'all' && !searchQuery && featuredResources.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Featured</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {featuredResources.map((resource, idx) => (
              <a
                key={idx}
                href={resource.url}
                className="group bg-gradient-to-br from-boon-blue/5 to-boon-lightBlue/20 p-6 rounded-2xl border border-boon-blue/10 hover:border-boon-blue/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{typeConfig[resource.type].icon}</span>
                  <span className="text-[10px] font-bold text-boon-blue uppercase tracking-widest">
                    {resource.type}
                  </span>
                </div>
                <h3 className="font-bold text-boon-text group-hover:text-boon-blue transition-colors text-lg">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {resource.description}
                </p>
                <p className="text-xs text-gray-400 mt-3 font-medium">
                  {resource.duration}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-boon-blue focus:ring-2 focus:ring-boon-blue/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeType === type
                  ? 'bg-boon-blue text-white shadow-lg shadow-boon-blue/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {type !== 'all' && <span>{typeConfig[type].icon}</span>}
              <span>{type === 'all' ? 'All' : typeConfig[type].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource, idx) => (
          <a
            key={idx}
            href={resource.url}
            className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-boon-blue/30 transition-all flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <span>{typeConfig[resource.type].icon}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {resource.type}
              </span>
            </div>
            <h3 className="font-bold text-boon-text group-hover:text-boon-blue transition-colors leading-snug">
              {resource.title}
            </h3>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">
              {resource.description}
            </p>
            <p className="text-xs text-gray-400 mt-3 font-medium">
              {resource.duration}
            </p>
          </a>
        ))}
      </div>

      {/* Empty State */}
      {filteredResources.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400">No resources found{searchQuery && ` matching "${searchQuery}"`}</p>
        </div>
      )}

      {/* Tip Card */}
      <section className="bg-gradient-to-br from-boon-lightBlue/30 to-boon-bg p-8 rounded-[2rem] border border-boon-lightBlue/30">
        <div className="flex items-start gap-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="font-bold text-boon-text mb-2">Getting the most from resources</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pick one resource that resonates with where you are right now. Before your next session,
              try applying one concept and share your experience with your coach.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
