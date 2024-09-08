import React from "react";
import { getImageUrl } from "../../utils";
import styles from "./Hero.module.css";
const Hero = () => {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Hi, I am Pranav</h1>
        <p className={styles.description}>
          I am a full stack developer with 5 years of experience in full stack
          development. Reach out if you would like to learn more{" "}
        </p>
        <a href="mailto:pranavmkale@gmail.com">Contact Me</a>
      </div>
      <img src={getImageUrl("hero/heroImage.png")} alt="Hero image of me" className={styles.heroImg}/>
      <div className={styles.topBlur}/>
      <div className={styles.bottomBlur}/>
    </section>
  );
};

export default Hero;
