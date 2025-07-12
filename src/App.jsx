import styles from "./App.module.css";
import Hero from "./components/Hero/Hero";
import { Navbar } from "./components/Navbar/Navbar";
import BlogHome from "./components/Blog/BlogHome";
import BlogPost from "./components/Blog/BlogPost";
import { Router, useRouter } from "./Router";

function AppContent() {
  const { path } = useRouter();

  let page = <Hero />;
  if (path === "/blog") page = <BlogHome />;
  if (path === "/blog/java-arraylist") page = <BlogPost />;

  return (
    <div className={styles.App}>
      <Navbar />
      {page}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
