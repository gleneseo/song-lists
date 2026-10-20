"use client";

import { createContext, useContext } from "react";

const InEntityModalContext = createContext(false);

/** Whether the caller is rendered inside an entity modal rather than on a full page. */
function useInEntityModal(): boolean {
  return useContext(InEntityModalContext);
}

export { InEntityModalContext, useInEntityModal };
