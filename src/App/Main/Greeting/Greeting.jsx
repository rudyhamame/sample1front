import { Link } from "react-router-dom";
import Nav from "../../Header/Nav/Nav";
import React, {useState, useEffect} from 'react'
import {storage} from "../../../firebase"
import {ref, uploadBytes, listAll, getDownloadURL} from "firebase/storage"
import {v4} from "uuid"

const Greeting=(props)=>{
  useEffect(()=>{
    listAll(imageListRef).then((response)=>{
      response.items.forEach((item)=>{
        getDownloadURL(item).then((url)=>{
          setImageList((prev)=>[...prev, url])
        })
      })
    })
  },[])
  const [imageUpload, setImageUpload]=useState(null)
  const[imageList, setImageList]=useState([])

  const imageListRef = ref(storage,"images/")

  const handleChange=(e)=>{
      setImageUpload(e.target.files[0])
      uploadImage()
  
  }
  const uploadImage=()=>{
    if(imageUpload===null) return;
    const imageRef= ref(storage, "images/"+props.state.my_id+"_pp")
    uploadBytes(imageRef, imageUpload).then((snapshot)=>{
      getDownloadURL(snapshot.ref).then((url)=>{
        setImageList((prev)=>[...prev, url])
      })
      alert("Image uploaded")
    })
  }

    return (
      <article id="Greeting_studysessions_article" className="fc">
      <section id="Greeting_preStart" className="fc slide-top">
        <div className="fc" style={{ alignItems: "center" }}>
          <h1>Hello {props.state.firstname},</h1>
          <h2>Let's start a new study session!</h2>
          {/* <button id="Greeting_preStart_button" className="fr">
            <Link to="/study">
              <i class="fas fa-stopwatch"></i> Start Timer
            </Link>
          </button> */}
          <button id="Greeting_preStart_button1" className="fr">
          <Link to="/study">
              <i class="fas fa-stopwatch"></i> Study tool
            </Link>
          </button>
          <button id="Greeting_preStart_button2" className="fr">
          <Link to="/studyplanner">
              <i class="fas fa-stopwatch"></i> Study organizer
            </Link>
          </button>
       
        </div>

        <div id="Greeting_preStart_reportDiv">
          <h3 style={{ textAlign: "center" }}>Previous Sessions</h3>
          <ul id="Greeting_studySessions_area" className="fc">
            {props.state.study_session &&
              props.state.study_session.length === 0 && (
                <div>There are no previous study sessions to show</div>
              )}
          </ul>
          <li id="Greeting_totalDuration_li"></li>
        </div>
        
      </section>
      <Nav path="/" />
      <div id="Greeting_userMenu_div" className="fc">
        <button id="Greeting_userMenu_button" onClick={()=>{
            let Greeting_userMenu_content_div= document.querySelector("#Greeting_userMenu_content_div");
            let Greeting_userMenu_content_div_CS=window.getComputedStyle(Greeting_userMenu_content_div)
            if( Greeting_userMenu_content_div_CS.getPropertyValue("display")==="none"){
            document.getElementById("Greeting_userMenu_content_div").style.display="flex"
          }else{
            document.getElementById("Greeting_userMenu_content_div").style.display="none"
          }
        }}>
        <i class="fi fi-bs-user" id="Greeting_userMenu_i"></i>
        </button>
        <div id="Greeting_userMenu_content_div" className="fc">
          <div id="Greeting_userMenu_personalInfo_div">
          <label class="Greeting_userMenu_title_label">Personal information</label>
          <div id="Greeting_userMenu_personalInfo_content_div" className="fc">
            <div className="fr Greeting_userMenu_contentDivs">
            <label>First name:</label>
            <p>{props.state.firstname}</p>
            </div>
            <div className="fr Greeting_userMenu_contentDivs">
            <label>Last name:</label>
            <p>{props.state.lastname}</p>
            </div>
            <div className="fr Greeting_userMenu_contentDivs">
            <label>Username:</label>
            <p>{props.state.username}</p>
            </div>
            <div className="fr Greeting_userMenu_contentDivs">
            <label>Password:</label>
            <p style={{color:"var(--red)",cursor:"pointer"}}>Change password</p>
            </div>
            <div className="fr Greeting_userMenu_contentDivs">
            <label>Profile picture</label>
            <section className="fc"  id="profile_pic_section">
              <div className="custom-file-upload_profilePic_div fc">   
                {imageList.map((url)=>{
                    return <img src={url} className="custom-file-upload_profilePic"/>
                  })}
                  </div>
              <label class="custom-file-upload">
              <i class="fi fi-sr-camera" id="profile_pic_i"></i>
              <input type="file" onChange={handleChange}/>
              </label>
              <button onClick={uploadImage} id="profile_pic_button">Upload</button>
            </section>
            </div>
          </div>
          </div>
        </div>
        </div>
    </article>
  );
}
export default Greeting