import React from "react"
import BlockContent from "@sanity/block-content-to-react"
import Layout from "../components/layout"
import SEO from "../components/seo"
import Video from "sanity-mux-player"

import "./projectPage.css"

const ProjectPage = ({ pageContext }) => (
  <Layout>
    <SEO title={pageContext.title} />
    <a className="backlink" href="/" onClick={(e) => {
        e.preventDefault()
        window.history.back()
      }}
      >← BACK
    </a>
    <h2>{pageContext.title}</h2>
    { pageContext.video ?
    <Video
      assetDocument={pageContext.video.asset}
      autoload={true}
      autoplay={true}
      muted={true}
      showControls={false}
      className="projectVideo"
    >  
    </Video>
    : null
    }

    <BlockContent className="projectBlock"
      blocks={pageContext.body}
      imageOptions={{w: 640, fit: 'max'}}
      projectId="5re0s6iv"
      dataset="prod"
    ></BlockContent>
  </Layout>
)

export default ProjectPage
