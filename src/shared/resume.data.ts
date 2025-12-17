export const RESUME_DATA = {
  profile: {
    name: 'Jainil Deven Mehta',
    role: 'Full-Stack Engineer',
    headline: 'Engineering Scalable Solutions',
    short_pitch:
      "Hi, I'm Jainil Mehta. I'm a Full-Stack Software Engineer specializing in the Angular & Node.js ecosystem. I transform complex requirements into high-performance, accessible web applications.",
    email: 'jainil237@gmail.com',
    location: 'Ahmedabad, India',
    summary:
      'Full-Stack Software Engineer with 2.5 years of experience in Angular, Node.js, Java, and PostgreSQL. Skilled in building scalable web applications, developing RESTful APIs, and integrating AI/LLM solutions. Proven track record in modernizing legacy codebases and enhancing user accessibility.',
    avatar:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Jainil&backgroundColor=18181b&clothing=blazerAndShirt&eyes=happy&skinColor=light',
    linkedin: 'https://www.linkedin.com/in/jainil-mehta-5b83a1183/',
    github: 'https://github.com/jainil237',
    medium: 'https://medium.com/@jainil237',
  },
  skills: [
    {
      name: 'Frontend',
      items: ['Angular', 'RxJS', 'NgRx', 'Signals', 'Material-Angular', 'React'],
    },
    { name: 'Backend', items: ['Node.js', 'NestJS', 'REST APIs', 'Sequelize'] },
    { name: 'Databases', items: ['PostgreSQL', 'MongoDB'] },
    { name: 'Coding Languages', items: ['TypeScript', 'JavaScript', 'Java', 'C++', 'C'] },
  ],
  experience: [
    {
      id: 'job-1',
      type: 'experience' as const,
      title: 'Software Engineer',
      subtitle: 'ARInspect - A Unit of Tyler Technologies',
      date: 'Jan 2023 - May 2025',
      location: 'Ahmedabad, India',
      description:
        'Spearheaded the migration to Angular v16 and engineered enterprise-grade web modules.',
      details: [
        'Developed and delivered enterprise-grade Angular web modules from planning to production, ensuring scalability and maintainability.',
        'Migrated the front-end web application from Angular v10 to v16, incorporating WCAG 2.1 accessibility enhancements.',
        'Refactored a traditional monolithic codebase into a modular MVVM architecture with custom state management.',
        'Implemented end-to-end analytics using Mixpanel event tracking for data-driven decision making.',
        'Designed reusable UI components with Angular Material, ensuring design consistency across all products.',
        'Collaborated with cross-functional teams to ensure timely product delivery and alignment with client requirements.',
      ],
      tags: [
        'Angular',
        'RxJS',
        'Node.JS',
        'Material Angular',
        'OpenAI API',
        'Mixpanel',
        'WCAG 2.1',
      ],
    },
    {
      id: 'job-2',
      type: 'experience' as const,
      title: 'Intern',
      subtitle: 'DXFactor Solutions Private Limited',
      date: 'Jul 2022 – Dec 2022',
      location: 'Ahmedabad, India',
      description:
        'Developed responsive dashboards and RESTful APIs to enhance business decision-making.',
      details: [
        'Developed responsive, data-driven dashboards using Angular and AmCharts, enabling business teams to visualize key performance metrics and improve decision-making efficiency.',
        'Designed and implemented modular RESTful APIs with .NET Core Web API, ensuring scalability, reusability, and seamless integration with frontend components.',
      ],
      tags: ['Angular', 'AmCharts', '.NET Core Web API', 'RESTful APIs'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      type: 'education' as const,
      title: 'BE in Computer Engineering',
      subtitle: 'LDRP Institute of Technology and Research',
      date: '2018 - 2022',
      location: 'Gandhinagar, India',
      description:
        'Graduated with 8.02 CGPA. Focused on Core CS fundamentals and Full Stack Development.',
      details: [
        'Achieved a CGPA of 8.02.',
        'Relevant Coursework: Data Structures & Algorithms, Database Management Systems, Operating Systems, Object-Oriented Programming.',
        'Secured AIR 5355 in GATE 2022 CS-IT paper',
      ],
      tags: [
        'Data Structures',
        'Operating Systems',
        'Object-Oriented Programming',
        'Database Management Systems',
        'Web Development',
        'Java',
        'C++',
        'C',
      ],
    },
  ],
  projects: [
    {
      title: 'FindsyouMatch',
      category: 'Social Platform',
      tech: 'Angular • .NET Core',
      desc: 'A high-performance matchmaking engine with real-time WebSocket messaging and complex filtering algorithms.',
    },
  ],
  awards: [
    {
      title: 'SPOT Award',
      org: 'ARInspect',
      date: 'Aug 2023',
      desc: 'Optimized ETL processes ensuring timely delivery.',
      link: '',
    },
    {
      title: 'Governor Scout Award',
      org: 'Rajya Puraskar',
      date: 'Feb 2015',
      desc: 'Highest state-level honor for Scouts.',
      link: '',
    },
  ],
  certificates: [
    {
      title: 'IBM Full Stack Software Developer',
      org: 'IBM',
      date: '',
      link: 'https://coursera.org/share/c5155c006c4d0f8d9559c3a14be2a2f3',
    },
    {
      title: 'Intro to TensorFlow for AI/ML/DL',
      org: 'DeepLearning.AI',
      date: '',
      link: 'https://coursera.org/share/ba18b5227e19d8d51d2c989468817360',
    },
    {
      title: 'Programming Foundations: JS, HTML, CSS',
      org: 'Coursera',
      date: '',
      link: 'https://coursera.org/share/2ecb4fae78477f74c26bf83becddbefe',
    },
    {
      title: 'McKinsey.org Forward Program',
      org: 'McKinsey & Company',
      date: '',
      link: 'https://www.credly.com/badges/e1a23e7d-c10d-4662-8f1f-99a8984d4f6d/public_url',
    },
  ],
};
