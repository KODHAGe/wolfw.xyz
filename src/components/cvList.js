//import { Link } from "gatsby"
//import PropTypes from "prop-types"
import React from "react"
import CvListItem from "./cvListItem"
import CvListTitle from "./cvListTitle"

import style from "./cvList.module.css"

const CvList = ({ items }) => (
  <div className={style.cvlist}>
    <CvListTitle>Recent positions</CvListTitle>
    <CvListItem dates="2020 – present" position="Data analyst | Team lead" company="The State Treasury of Finland" clients="Clients: Government ministries of Finland" keywords="">
      Leading the data analytics team at the State Treasury in a role between practise and management.
      <ul>
        <li>Proactively identifying and addressing potential cases for data analysis</li>
        <li>Leading visual analytics, data visualization and data product/ux design competencies</li>
        <li>Supporting in data engineering/analytics development related technical tasks</li>
        <li>Responsible for client communications with the government ministries</li>
        <li>Developing and designing custom visualizations in react/d3/highcharts and standard based dashboards in PowerBI</li>
        <li>Developing the iterative modes of work within the team (Scrum-inspired)</li>
        <li>Championing applied design thinking in client work (iterative define -&gt; ideate -&gt; prototype -&gt; deliver -phases)</li>
      </ul>
    </CvListItem>
    <CvListItem dates="2017 – 2020" position="Designer ∨ Developer" company="Frantic" clients="Clients: SOK, Kemira, Pihlajalinna, Posti, VTV" keywords="">
      Working as a designer/developer in both consulting and project roles in a digital agency setting.
      <ul>
        <li>UI Design of multiple projects in several fields, ranging from mobile apps to process management software</li>
        <li>UX/Interaction design through prototyping and an iterative process - primarily high fidelity interactive prototypes (UXPin, InVision, Sketch, Figma, Framer etc)</li>
        <li>UX/Product design research experience, designing surveys and interviews, developing prototypes, running workshops</li>
        <li>Developing web based apps in PHP/JavaScript, ranging from high-definition prototypes to production ready components (Wordpress, React, Vue.js, vanilla js)</li>
        <li>Responsible for client communication and project management in consultancy roles</li>
        <li>Developing my ability to learn and adapt very quickly into different roles, teams, requirements and sets of users</li>
      </ul>
    </CvListItem>
    <div className="break-after"></div>
    <CvListItem dates="2015 – 2017" position="Development specialist (part-time)" company="STT" clients="" keywords="">
      Continued but separate contract working part-time during further university studies, with main responsibility over an internal analytics tool project and news robotics tests.
      <ul>
        <li>End-to-end ownership of design and development for a unique news throughput analytics service from co-developed concept to finalized product prototype</li>
        <li>Iterative process of building prototypes and experimental designs in code, testing, gathering feedback and forming insights into new features</li>
        <li>Visual/User interface design in Adobe tools</li>
        <li>Building tools for explorative visual analysis with visualization tools like Google Charts, Highcharts, d3</li>
        <li>Collaboration with data providers, custom API-integrations</li>
        <li>Front-end development in JavaScript (Ember), back-end in heroku (node.js)</li>
        <li>Building prototypes of news robots for automatic text production</li>
        <li>Handover of final prototype to production, that would later go on to receive <a href="https://stt.fi/stt-tarkkailija-dni-rahoitus/">Google Digital News Initiative funding (in Finnish)</a></li>
      </ul>
    </CvListItem>
    <CvListItem dates="2014 – 2015" position="Digital service developer/designer" company="STT" clients="Clients: Iltalehti, KSML, Apu, Veikkaus" keywords="">
      Research, development and design of new visualization based tools and products for STT media service clients.
      <ul>
        <li>Responsible for UX/UI and code implementation of data visualization tools</li>
        <li>Working in a small, agile R&amp;D -type team, designing and developing experimental products</li>
        <li>Data visualization with tools like QGis, Mapbox, Leaflet, jQuery, custom javascript</li>
      </ul>
    </CvListItem>
    <CvListItem dates="2013 – 2014" position="Data journalist, interactive graphic designer" company="STT" clients="" keywords="">
      From internship to thesis project to full-time position. Pioneering projects of digital journalism and online data visualization as the first employee of the STT data newsdesk.
      <ul>
        <li>Designing interactive news graphics with a focus on data visualization</li>
        <li>Working together with other journalists to identify interesting topics or points of view through data</li>
        <li>Synthesizing and visualizing complex topics to make them accessible to readers</li>
      </ul>
    </CvListItem>
    {/*<CvListItem dates="2012 – 2012" position="Intern of everything" company="TWO" clients="Projects for: Nokia, Eevil Stöö, Disco Dislocated" keywords="concept design, photography, event production">
    Internship at the good people of creative agency TWO (RIP). Photography, concept development, event organizing, graphic & web design, coffee brewing, general entrepreneurship.
    </CvListItem>
    <CvListItem dates="2012 – present" position="Digital designer" company="GRH" clients="" keywords="">
    The digital part of a two person freelance design team, currently under the moniker of GRH – the latest in a line of freelance web design work & more experimental output since my late teens.
    </CvListItem>*/}
    <div className="break-after"></div>
    <CvListTitle>Education</CvListTitle>
    <CvListItem dates="2015 - 2019" position="MA in New Media Design and Production" company="Aalto University School of Arts, Design and Architecture" clients="" keywords="">
      Graduated as Master of Arts from the Aalto Media Lab. Studies in a wide range of creative topics, with a focus on user interfaces, data visualization and design research.
    </CvListItem>
    <CvListItem dates="2013 – 2013" position="Erasmus exchange" company="Glasgow Caledonian University" clients="" keywords="">
      Exchange studies at the Graphic Design for Digital Media program on courses focusing on user-centered design tools and methods, user interface and user experience design.
    </CvListItem>
    <CvListItem dates="2011 - 2015" position="BEng. in Media Technology" company="Metropolia University of Applied Sciences" clients="" keywords="">
      Graduated with a Bachelor of Engineering degree in Media Technology, with a specialisation in digital media and content production. Heavy on practical web development, with a side of design methods, 3d-graphics and printing production.
    </CvListItem>
    <CvListItem dates="2008 - 2011" position="(uncompleted) B.Sci. in Computer Science" company="University of Helsinki" clients="" keywords="">
      Studies in computer science, mathematics and (most importantly) cognitive science and philosophy, that set me off a different path leading to the abandonment of the pursuit of this degree.
    </CvListItem>
    <div className="break-after"></div>
    <CvListTitle>Other more/less relevant skills</CvListTitle>
    <CvListItem>
      <p>I am adept at several digital design tools, like Sketch, Figma &amp; Adobe Suite and always interested to add more of these into my skillset, taking pride in being quick to adapt and learn.</p>
      <p>I am familiar with different design methodologies and very interested in the theory behind them. I particularly enjoy building prototypes, conducting user interviews, surveys, fieldwork and applying quantitative analytical skills to design and design skills to quantitative analysis.</p>
      <p>I am a proficient front-end web developer, experienced in building software with javascript based tools such as React, Vue and Angular. When needed, diving into the back-end is not unfamiliar with applied experience in node.js and PHP. </p>
      <p>I am fluent in Finnish, Swedish and English at a native level (both written and oral), with a Cambridge Professional English-certificate to vouch for the third one.</p>
      <p>In my free time I enjoy making art in different mediums, taking (mediocre) photographs, traveling to learn about different cultures, reading both fact and fiction, and the freedom of bicycling, running or hiking.</p>
    </CvListItem>
  </div>
)

export default CvList
