import React from "react";
import styles from "./BlogPost.module.css";

export default function BlogPost() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Java ArrayList</h2>
      <p>
        The ArrayList in Java is a resizable array, part of the java.util package.
        It allows elements to be added and removed dynamically and handles the
        sizing automatically.
      </p>
      <p>
        To create an ArrayList, use the ArrayList class and specify the type of
        elements it will contain.
      </p>
      <pre className={styles.code}>{`List<String> list = new ArrayList<>();`}</pre>
    </div>
  );
}
