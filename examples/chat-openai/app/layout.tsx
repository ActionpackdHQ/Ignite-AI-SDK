import React, { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Chat OpenAI - Actionpackd AI SDK',
  description: 'A streaming chat example using Actionpackd Ignite AI SDK with OpenAI',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
