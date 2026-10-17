/**
 * ============================================================================
 * PORTFOLIO VOICE NARRATION DATA REGISTRY
 * Contains verified audio narrations for Welcome and all Featured Projects.
 * ============================================================================
 */

const PORTFOLIO_VOICE_DATA = {
  welcome: {
    id: 'welcome',
    title: 'Welcome Introduction',
    subtitle: 'Santhosh Sekar • Full Stack Web Developer',
    text: "Hello, and welcome to my portfolio! I'm a Computer Science and Engineering student with a passion for web development and artificial intelligence. Feel free to explore my projects and discover what I've been building. Let's get started!"
  },
  'foreign-rental': {
    id: 'foreign-rental',
    title: 'Foreign Rental Accommodation',
    subtitle: 'Rental Platform • Web Application',
    text: "Welcome to Foreign Rental Accommodation! This project is designed to help people find suitable rental homes in different cities across India. The platform allows users to explore available properties, discover accommodation options, and find homes that match their needs. My goal was to create a user-friendly platform that makes the property search process easier, faster, and more convenient. Through this project, I gained practical experience in web development and creating an attractive user interface. Thank you for exploring my project!"
  },
  'polar-energy': {
    id: 'polar-energy',
    title: 'Smart Energy Management System for Polar Research Stations',
    subtitle: 'IoT & CleanTech AI Digital Twin',
    text: "Hello! Let me introduce my Smart Energy Management System for Polar Research Stations. Polar research stations operate in extremely cold environments, where managing energy efficiently is very important. This project focuses on monitoring energy consumption and helping research stations use available power more efficiently. The main goal is to reduce energy waste, improve energy management, and support the reliable operation of essential equipment in these challenging environments. This project helped me explore how technology can be used to solve real-world energy challenges in remote locations. Thank you for exploring my project!"
  },
  'edumanage': {
    id: 'edumanage',
    title: 'EduManage – Student Management System',
    subtitle: 'Academic Administration & RBAC Portal',
    text: "Hello! Let me introduce EduManage, my Student Management System. This project is designed to simplify student record management and make academic administration more efficient. It includes separate access for administrators, teachers, and students, with role-based permissions to protect information and provide the right features to each user. Administrators can manage student records, while teachers and students can access the features available to their respective roles. I developed this project using React for the frontend, FastAPI for the backend, and MongoDB for database management. Through this project, I gained practical experience in full-stack development, authentication, database connectivity, and role-based access control. Thank you for exploring EduManage!"
  },
  'internconnect': {
    id: 'internconnect',
    title: 'InternConnect AI – Internship Portal',
    subtitle: 'Enterprise AI Career & Internship Platform',
    text: "Hello! Let me introduce InternConnect AI, an AI-powered Internship Management Portal. This platform is designed to connect students, companies, and mentors through a single system. Students can explore internship opportunities, submit applications, track their application status, and manage their assigned tasks. Companies can manage internship opportunities and review student applications, while mentors can support students throughout their internship journey. The platform also includes an AI Coach to help students improve their career readiness and prepare for professional opportunities. I developed this project using React for the frontend, FastAPI for the backend, and MongoDB for database management, with JWT authentication and role-based access control. This project helped me strengthen my full-stack development skills and understand how AI can enhance internship management. Thank you for exploring InternConnect AI!"
  },
  'showcase-portfolio': {
    id: 'showcase-portfolio',
    title: 'Interactive Developer Showcase – My Portfolio',
    subtitle: 'Modern Engineering & Voice Portfolio',
    text: "Hello, and welcome to my Interactive Developer Showcase! I'm a Computer Science and Engineering student with a strong interest in web development and artificial intelligence. This portfolio is designed to showcase my projects, technical skills, learning journey, and passion for building real-world applications. What makes it special is the interactive experience, where visitors can listen to voice introductions and learn about each project through audio narration. My goal is to make exploring my work more engaging, accessible, and enjoyable. Feel free to explore my projects, discover the technologies I've used, and learn more about my journey as a developer. Thank you for visiting my portfolio. Enjoy exploring!"
  }
};

if (typeof window !== 'undefined') {
  window.PORTFOLIO_VOICE_DATA = PORTFOLIO_VOICE_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PORTFOLIO_VOICE_DATA;
}
