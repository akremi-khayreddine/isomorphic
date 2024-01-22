import React from 'react';

export default function ({ url, icon }) {
  return (
    <li>
      <a href={url}>{icon}</a>
    </li>
  );
}
