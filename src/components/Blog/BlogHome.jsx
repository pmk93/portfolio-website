import React from "react";
import { Link } from "../../Router";
import styles from "./BlogHome.module.css";
import { getImageUrl } from "../../utils";

const posts = [
  {
    slug: "java-arraylist",
    title: "Java ArrayList",
    thumbnail: getImageUrl("projects/project.png"),
    excerpt: "Introduction to ArrayList in Java",
  },
];

export default function BlogHome() {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Blog</h2>
      <div className={styles.posts}>
        {posts.map((post) => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className={styles.post}>
            <img src={post.thumbnail} alt="thumbnail" />
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
