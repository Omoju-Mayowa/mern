import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { AnimatePresence, motion } from "motion/react";
import NavBar from "./NavBar";
import Footer from "./Footer";
import CursorManager from "./CursorManager";

const Layout = () => {
  const location = useLocation();
  const footerRef = useRef(null);


  // --- Smooth scrolling (Lenis)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 2,
      smoothWheel: true,
      smoothTouch: false,
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <>
      <CursorManager />

      {/* MAIN APP CONTENT */}
        <>
          <NavBar />
          <motion.main
            className="main-content"
            key={location.pathname}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <Outlet />
          </motion.main>
          <footer ref={footerRef} className="animated-footer">
            <Footer />
          </footer>
        </>
    </>
  );
};

export default Layout;
