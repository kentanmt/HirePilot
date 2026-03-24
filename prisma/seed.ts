import { db } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // Clean slate
  db.readinessScore.deleteMany({});
  db.interviewQuestion.deleteMany({});
  db.interviewSession.deleteMany({});
  db.contact.deleteMany({});
  db.applicationStatusHistory.deleteMany({});
  db.application.deleteMany({});
  db.resume.deleteMany({});
  db.job.deleteMany({});
  db.userProfile.deleteMany({});
  db.session.deleteMany({});
  db.account.deleteMany({});
  db.user.deleteMany({});

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const user = db.user.create({
    data: { name: "Alex Rivera", email: "alex@demo.com", password: passwordHash, image: null },
  });

  db.userProfile.create({
    data: {
      userId: user.id,
      targetRole: "Senior Software Engineer",
      seniority: "senior",
      targetLocations: JSON.stringify(["San Francisco, CA", "New York, NY", "Remote"]),
      targetCompanies: JSON.stringify(["Stripe", "Linear", "Vercel", "Anthropic", "Figma"]),
      skills: JSON.stringify(["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "GraphQL"]),
      yearsExperience: 6,
      linkedinUrl: "https://linkedin.com/in/alexrivera",
      githubUrl: "https://github.com/alexrivera",
      bio: "Full-stack engineer passionate about developer tools and AI-powered products.",
      onboardingDone: true,
    },
  });

  db.resume.create({
    data: {
      userId: user.id,
      name: "Alex Rivera - Base Resume",
      isBase: true,
      content: JSON.stringify({
        summary: "Senior Software Engineer with 6+ years building scalable web applications.",
        experience: [
          { company: "TechCorp Inc.", title: "Senior Software Engineer", duration: "2021–Present", bullets: ["Led migration of monolith to microservices, reducing deploy time by 60%", "Built real-time collaboration features used by 50K+ daily active users"] },
          { company: "StartupXYZ", title: "Software Engineer", duration: "2018–2021", bullets: ["Built core API serving 2M+ requests/day"] },
        ],
        skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "GraphQL", "Docker"],
        education: [{ school: "UC Berkeley", degree: "B.S. Computer Science", year: "2018" }],
      }),
    },
  });

  const jobs = [
    db.job.create({ data: { userId: user.id, title: "Senior Software Engineer", company: "Stripe", location: "San Francisco, CA", remote: true, salaryMin: 180000, salaryMax: 250000, description: "Join Stripe's infrastructure team to build the financial infrastructure of the internet.", requirements: JSON.stringify(["TypeScript", "Distributed systems", "API design", "5+ years experience"]), url: "https://stripe.com/jobs", source: "linkedin", matchScore: 94, matchReason: "Your TypeScript and Node.js expertise aligns perfectly with Stripe's stack.", isSaved: true } }),
    db.job.create({ data: { userId: user.id, title: "Staff Engineer, Developer Experience", company: "Vercel", location: "Remote", remote: true, salaryMin: 200000, salaryMax: 280000, description: "Shape the future of frontend development tooling.", requirements: JSON.stringify(["React", "Next.js", "Build tools", "7+ years experience"]), url: "https://vercel.com/careers", source: "greenhouse", matchScore: 88, matchReason: "Your React/Next.js experience is a strong match.", isSaved: true } }),
    db.job.create({ data: { userId: user.id, title: "Senior Engineer, Product", company: "Linear", location: "San Francisco, CA", remote: true, salaryMin: 170000, salaryMax: 230000, description: "Build the issue tracker that the best software teams use.", requirements: JSON.stringify(["TypeScript", "React", "PostgreSQL", "4+ years experience"]), url: "https://linear.app/careers", source: "lever", matchScore: 96, matchReason: "Near-perfect match. TypeScript, React, and PostgreSQL skills align exactly with Linear's stack.", isSaved: true } }),
    db.job.create({ data: { userId: user.id, title: "Software Engineer, AI", company: "Anthropic", location: "San Francisco, CA", remote: false, salaryMin: 200000, salaryMax: 300000, description: "Build AI-powered products at the frontier.", requirements: JSON.stringify(["Python", "TypeScript", "ML familiarity", "API design"]), url: "https://anthropic.com/careers", source: "anthropic", matchScore: 79, matchReason: "Good match on TypeScript and API design.", isSaved: true } }),
    db.job.create({ data: { userId: user.id, title: "Frontend Engineer, Design Systems", company: "Figma", location: "San Francisco, CA", remote: true, salaryMin: 160000, salaryMax: 220000, description: "Build the design system powering Figma's product.", requirements: JSON.stringify(["React", "CSS", "Accessibility", "Design systems"]), url: "https://figma.com/careers", source: "linkedin", matchScore: 82, matchReason: "Strong React match.", isSaved: false } }),
  ];

  const app1 = db.application.create({ data: { userId: user.id, jobId: jobs[2].id, status: "INTERVIEW", appliedAt: new Date(Date.now() - 14 * 86400000).toISOString(), nextStep: "Technical Interview", nextStepAt: new Date(Date.now() + 2 * 86400000).toISOString(), aiGenerated: true, coverLetter: "Dear Linear team, I'm excited to apply..." } });
  db.applicationStatusHistory.createMany({ data: [
    { applicationId: app1.id, status: "APPLIED", changedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
    { applicationId: app1.id, status: "PHONE_SCREEN", changedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { applicationId: app1.id, status: "INTERVIEW", changedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  ]});

  const app2 = db.application.create({ data: { userId: user.id, jobId: jobs[0].id, status: "APPLIED", appliedAt: new Date(Date.now() - 5 * 86400000).toISOString(), aiGenerated: true } });
  db.applicationStatusHistory.createMany({ data: [{ applicationId: app2.id, status: "APPLIED", changedAt: new Date(Date.now() - 5 * 86400000).toISOString() }] });

  db.application.create({ data: { userId: user.id, jobId: jobs[1].id, status: "NOT_STARTED", aiGenerated: false } });

  db.resume.create({ data: { userId: user.id, jobId: jobs[2].id, name: "Alex Rivera - Linear (Tailored)", isBase: false, version: 1, content: JSON.stringify({ summary: "Senior Software Engineer specializing in TypeScript and React.", experience: [{ company: "TechCorp Inc.", title: "Senior Software Engineer", duration: "2021–Present", bullets: ["Built real-time collaboration features using CRDTs, now used by 50K+ daily users"] }] }), changes: JSON.stringify([{ type: "modified", section: "summary", description: "Reframed around collaborative tools" }]) } });

  db.contact.createMany({ data: [
    { userId: user.id, jobId: jobs[2].id, name: "Karri Saarinen", title: "Co-founder & CEO", company: "Linear", platform: "LINKEDIN", profileUrl: "https://linkedin.com/in/karrisaarinen", relevance: "Co-founder with strong design sensibility.", outreach: "Hi Karri, I've been using Linear for 2 years...", responded: false },
    { userId: user.id, jobId: jobs[0].id, name: "Shreya Patel", title: "Engineering Manager, Infrastructure", company: "Stripe", platform: "LINKEDIN", profileUrl: "https://linkedin.com/in/shreyapatel", relevance: "Hiring manager for the infrastructure team.", outreach: "Hi Shreya, I came across the Senior Software Engineer opening...", sentAt: new Date(Date.now() - 3 * 86400000).toISOString(), responded: true },
  ]});

  const session = db.interviewSession.create({ data: { userId: user.id, jobId: jobs[2].id, title: "Linear - Technical Interview Prep", score: 78 } });
  db.interviewQuestion.createMany({ data: [
    { sessionId: session.id, type: "BEHAVIORAL", question: "Tell me about a time you had to make a difficult technical decision with incomplete information.", answer: "At TechCorp, we had to decide whether to migrate from REST to GraphQL mid-sprint...", feedback: "Good STAR structure. Strengthen by quantifying the outcome.", score: 8, tips: JSON.stringify(["Quantify business impact", "Mention what you'd do differently"]), practiced: true },
    { sessionId: session.id, type: "TECHNICAL", question: "How would you design a real-time collaborative editing system like Linear's issue editor?", answer: "", feedback: null, score: null, tips: "[]", practiced: false },
    { sessionId: session.id, type: "ROLE_SPECIFIC", question: "What's your philosophy on API design?", answer: "I believe in progressive disclosure...", feedback: "Excellent answer.", score: 9, tips: JSON.stringify(["Add example of API versioning approach"]), practiced: true },
  ]});

  db.readinessScore.create({ data: { userId: user.id, overallScore: 72, resumeScore: 80, applicationScore: 65, networkScore: 60, interviewScore: 78, actionItems: JSON.stringify(["Complete 3 more interview practice sessions for Linear", "Send outreach to 2 more contacts at Stripe", "Apply to Vercel and Anthropic roles", "Add ML project to resume"]), insights: "Strong resume and interview fundamentals. Application volume and network activity need attention." } });

  console.log("✅ Seed complete! Demo: alex@demo.com / demo1234");
}

main().catch(console.error);
