/**
 * Write-only the password as cookie
 */

import React, { useState } from 'react'
import { setSessionPassword } from '../utils/utils'
import Layout from '../../../components/layout'

import style from './PasswordProtect.module.css'
console.log(style)
const PasswordProtect = () => {
  const [password, setPassword] = useState('');

  const onSubmit = event => {
    event.preventDefault();
    setSessionPassword(password);
    window.location.reload(); // eslint-disable-line
  };

  return (
    <Layout>
      <strong>if you have a password you can enter</strong>
      <form onSubmit={onSubmit}>
        <input
          name="password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
        />

        <button className={style.submit} type="submit">check it out</button>
      </form>
      <div className={style.linkList}>
        <a className={style.link} href="/">back to the front page</a><br/>
        <a className={style.link} href="mailto:wolf@grh.fi">ask for access</a>
      </div>
    </Layout>
  );
};

export default PasswordProtect;
