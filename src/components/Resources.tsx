import { useState } from 'react';

interface Resource {
  title: string;
  description: string;
  type: 'article' | 'video' | 'exercise' | 'book';
  duration: string;
  url: string;
}

interface ResourceCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  resources: Resource[];
}

const resourceCategories: ResourceCategory[] = [
  {
    id: 'leadership',
    label: 'Leadership & Management',
    icon: '👔',
    color: 'blue',
    resources: [
      {
        title: 'The Art of Servant Leadership',
        description: 'Learn how putting your team first creates stronger results and deeper trust.',
        type: 'article',
        duration: '8 min read',
        url: '#',
      },
      {
        title: 'Leading Through Change',
        description: 'Practical strategies for guiding your team through uncertainty and transformation.',
        type: 'video',
        duration: '12 min watch',
        url: '#',
      },
      {
        title: 'The 5 Whys Framework',
        description: 'A simple technique to get to the root cause of any problem.',
        type: 'exercise',
        duration: '15 min exercise',
        url: '#',
      },
      {
        title: 'Radical Candor',
        description: 'Kim Scott\'s framework for caring personally while challenging directly.',
        type: 'book',
        duration: 'Book summary',
        url: '#',
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: '💬',
    color: 'purple',
    resources: [
      {
        title: 'Active Listening Techniques',
        description: 'Transform your conversations by truly hearing what others are saying.',
        type: 'article',
        duration: '6 min read',
        url: '#',
      },
      {
        title: 'Giving Feedback That Lands',
        description: 'How to deliver constructive feedback that motivates rather than deflates.',
        type: 'video',
        duration: '10 min watch',
        url: '#',
      },
      {
        title: 'The Difficult Conversation Prep',
        description: 'A worksheet to prepare for challenging discussions with confidence.',
        type: 'exercise',
        duration: '20 min exercise',
        url: '#',
      },
      {
        title: 'Crucial Conversations',
        description: 'Tools for talking when stakes are high and emotions run strong.',
        type: 'book',
        duration: 'Book summary',
        url: '#',
      },
    ],
  },
  {
    id: 'wellbeing',
    label: 'Mental Well-being',
    icon: '🧠',
    color: 'green',
    resources: [
      {
        title: 'The Mindful Pause',
        description: 'A simple technique to create space between stimulus and response.',
        type: 'article',
        duration: '5 min read',
        url: '#',
      },
      {
        title: 'Managing Energy, Not Time',
        description: 'Why sustainable performance comes from managing your energy reserves.',
        type: 'video',
        duration: '15 min watch',
        url: '#',
      },
      {
        title: 'Morning Reflection Practice',
        description: 'A 5-minute journaling exercise to start your day with intention.',
        type: 'exercise',
        duration: '5 min daily',
        url: '#',
      },
      {
        title: 'Essentialism',
        description: 'Greg McKeown\'s guide to doing less but better.',
        type: 'book',
        duration: 'Book summary',
        url: '#',
      },
    ],
  },
];

const typeIcons: Record<string, string> = {
  article: '📄',
  video: '▶️',
  exercise: '✏️',
  book: '📚',
};

const typeLabels: Record<string, string> = {
  article: 'Article',
  video: 'Video',
  exercise: 'Exercise',
  book: 'Book',
};

export default function Resources() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = activeCategory === 'all'
    ? resourceCategories
    : resourceCategories.filter(cat => cat.id === activeCategory);

  const filterResources = (resources: Resource[]) => {
    if (!searchQuery) return resources;
    return resources.filter(r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-boon-text tracking-tight">Resources</h1>
        <p className="text-gray-500 mt-2 font-medium">Curated content to support your growth journey.</p>
      </header>

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
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-boon-blue text-white shadow-lg shadow-boon-blue/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All
          </button>
          {resourceCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeCategory === cat.id
                  ? 'bg-boon-blue text-white shadow-lg shadow-boon-blue/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resource Categories */}
      <div className="space-y-10">
        {filteredCategories.map(category => {
          const resources = filterResources(category.resources);
          if (resources.length === 0) return null;

          return (
            <section key={category.id}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{category.icon}</span>
                <h2 className="text-xl font-extrabold text-boon-text">{category.label}</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {resources.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.url}
                    className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-boon-blue/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{typeIcons[resource.type]}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {typeLabels[resource.type]}
                          </span>
                        </div>
                        <h3 className="font-bold text-boon-text group-hover:text-boon-blue transition-colors leading-snug">
                          {resource.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {resource.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-3 font-medium">
                          {resource.duration}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-boon-bg flex items-center justify-center flex-shrink-0 group-hover:bg-boon-blue/10 transition-colors">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-boon-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCategories.every(cat => filterResources(cat.resources).length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-400">No resources found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Tip Card */}
      <section className="bg-gradient-to-br from-boon-lightBlue/30 to-boon-bg p-8 rounded-[2rem] border border-boon-lightBlue/30">
        <div className="flex items-start gap-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="font-bold text-boon-text mb-2">Getting the most from resources</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Pick one resource that resonates with your current focus area. Before your next session,
              try applying one concept and share your experience with your coach.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
