import { useState } from "react";
import axios from "axios";

export const getServerSideProps = ({ query }) => {
  return { props: { query } }
}

const Proxy = ({ query }) => {
  console.log(query)
  return (
    <div>
      <iframe src={query.page} style={{width: "100%", height: "100vh"}} />
      </div>
  )
}

export default Proxy;