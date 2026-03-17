//...........IMPORT..........
import React, { createElement, useEffect } from 'react'
import "./study.css"
//.........VARIABLES.................
var keywordStructure
var keywordStructureProperty
var keywordStructureArray = []
var keywordFunction=""
var keywordStructurePropertySelectedArray=[]
var keywordStructurePropertySelectedSubjectArray =[]
var keywordStructurePropertySelectedObjectArray =[]
var keywordFuctionPropertySelected
var keywordFunctionProperty
var propertyObjectInEdit
var dataTypeinEdit
var unitsInMemoryRetrieved=[]
var dataTypesInMemoryRetrieved=[]
var setsInMemoryRetrieved=[]
var propertyObjectsRetrieved=[]
var keywordObjectInEdit
var itemsOfSetInWorkingArray = []
//.............................
const Study = (props) => {

  const [is_loading, setIs_loading] = React.useState(null);

  React.useEffect(()=>{
    retrieveKeywords("unit_inMemory",true)
    retrieveKeywords("dataType_inMemory",true)
    retrieveKeywords("set_inMemory",true)
    retrieveKeywords("propertyObject",true)
    retrieveKeywords("functionNature",true)
    retrieveKeywords("changeFactor",true)
    retrieveKeywords("Structure",true)
    retrieveKeywords("Function",true)
  },[])

  //...........deleteCustomize..................
  const deleteCustomize=(customizeID,type)=>{
    setIs_loading(true)
    let url =
    "http://localhost:4000/api/user/deleteCustomize/" +
    props.state.my_id+"/"+customizeID+"/"+type;
  let options = {
    method: "DELETE",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      retrieveKeywords(type,true)      
      setIs_loading(false)
    }
  })
  }
  //..........addCustomize
  const editCustomize=(object,propertyObjectID,type)=>{
    setIs_loading(true)
    let url =
    "http://localhost:4000/api/user/editCustomize/" +
    props.state.my_id+"/"+propertyObjectID+"/"+type;
  let options = {
    method: "PUT",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body:JSON.stringify(object)
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      retrieveKeywords(type,true)
      setIs_loading(false)
      switch (type) {
        case "propertyObject": {
          document.getElementById("study_settings_content_customize_propertyName_input").value=""
          document.getElementById("study_settings_content_customize_propertyLevel_select").value="Property level"
          document.getElementById("study_settings_content_customize_propertyDataType_select").value="Property data type"
          document.getElementById("study_settings_content_customize_propertySet_select").value="Property domain"
          document.getElementById("study_settings_content_customize_propertyUnit_select").value="Property unit"
        }
        break
      }


    }
  })
  }
  //........................Edit propertObject and Unit
  const editPropertyObjectAndUnitCustomize=(object)=>{
    setIs_loading(true)
    let url =
    "http://localhost:4000/api/user/editPropertyObjectAndUnitCustomize/" +
    props.state.my_id+"/"+object.propertyObject._id;
  let options = {
    method: "PUT",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body:JSON.stringify(object)
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      retrieveKeywords("propertyObject",true)
      retrieveKeywords("unit_inMemory",true)
      setIs_loading(false)
      document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitInput").value=""
      document.getElementById("study_settings_content_customize_propertyName_input").value=""
      document.getElementById("study_settings_content_customize_propertySet_select").value="Property domain"
      document.getElementById("study_settings_content_customize_propertyLevel_select").value="Property level"
    }
  })
  }
  //..........addCustomize
  const addCustomize=(object,type)=>{
    let url =
    "http://localhost:4000/api/user/addCustomize/" +
    props.state.my_id+"/"+type;
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body:JSON.stringify(object)
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      retrieveKeywords(type,true)
      if(type==="unit_inMemory") document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitInput").value=""
      if(type==="propertyObject"){ 
        document.getElementById("study_settings_content_customize_propertyName_input").value=""
        document.getElementById("study_settings_content_customize_propertySet_select").value="Property domain"
        document.getElementById("study_settings_content_customize_propertyLevel_select").value="Property level"
      }
      if(type==="functionNature") document.getElementById("study_settings_content_customize_functionNature_input").value=""
      if(type==="changeFactor") document.getElementById("study_settings_content_customize_changeFactor_input").value=""


    }
  })
  }
   //..........addMemory
   const addMemory=(object,type)=>{
    let url =
    "http://localhost:4000/api/user/addMemory/" +
    props.state.my_id+"/"+type;
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body:JSON.stringify({object:object})
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      retrieveKeywords(type,true)
      switch (type) {
        case "dataType_inMemory": document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeInput").value=""
        break
        case "set_inMemory": document.getElementById("study_settingsCustomization_content_inMemorySets_setInput").value=""
        break
        case "unit_inMemory": document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitInput").value=""
        break
      }



    }
  })
  }
  //..........addMemory
  const deleteMemory=(memoryID,type)=>{
    let url =
    "http://localhost:4000/api/user/deleteMemory/" +
    props.state.my_id+"/"+memoryID+"/"+type;
    let options = {
      method: "DELETE",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((response)=>{
      if(response.status===201){
        retrieveKeywords(type,true)
      }
    })
  }
  //..........editMemory
  const editMemory=(object,memoryID,type)=>{
    setIs_loading(true)
    let url =
    "http://localhost:4000/api/user/editMemory/" +
    props.state.my_id+"/"+memoryID+"/"+type;
    let options = {
      method: "PUT",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + props.state.token,
        "Content-Type": "application/json",
      },
      body:JSON.stringify({
        object:object
      })
    };
    let req = new Request(url, options);
    fetch(req).then((response)=>{
      if(response.status===201){
        retrieveKeywords(type,true)
        setIs_loading(false)
        document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeAddButton").style.display="inline"
        document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeEditButton").style.display="none"
      }
    })
  }
  //..............updateFunctionStructureProperties..........
  const updateFunctionStructureProperties= async (functionKeywordID)=>{
    let keyword_structureArray=[]
    let url =
    "http://localhost:4000/api/user/update/" +
    props.state.my_id;
  let options = {
    method: "GET",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
  };
  let req = new Request(url, options);
  await fetch(req).then((response)=>{
    if(response.status===200){
      return response.json()
    }}).then((jsonData)=>{
      return jsonData
    }).then((jsonData)=>{
      jsonData.study.structure_keywords.forEach((keyword_structure)=>{
        var keywordPropertiesArray=[]
        keyword_structure.keyword_structureProperties.forEach((property)=>{
          if(property.keyword_functionID!=="" && property.keyword_functionID===functionKeywordID){
            jsonData.study.function_keywords.forEach((keyword_function)=>{
              if(keyword_function._id===functionKeywordID){
                keywordPropertiesArray.push
                ({
                  _id:property._id,
                  keyword_functionID:property.keyword_functionID,
                  keyword_structureName:keyword_function.keyword_functionName + " > "+keyword_structure.keyword_structureName,
                  keyword_propertyName:property.keyword_propertyName,
                  keyword_propertyValue:property.keyword_propertyValue,
                  keyword_propertyUnit:property.keyword_propertyUnit,
                })
            }
          })      
          }else{
            keywordPropertiesArray.push(property)
          }
      })
      keyword_structureArray.push({
        _id:keyword_structure._id,
        keyword_structureName: keyword_structure.keyword_structureName,
        keyword_structureStatus:keyword_structure.keyword_structureStatus,
        keyword_structureLevel: keyword_structure.keyword_structureLevel,
        keyword_structureProperties: keywordPropertiesArray,
      })
    })
    return keyword_structureArray
    }).then((keyword_structureArray)=>{
      editKeywordStructurePropertiesForOneStructure(keyword_structureArray)
    })
}
  //..............plusMenuIconStrucutreKeyword.............
  const plusMenuIconStrucutreKeyword=(keywordID)=>{
    let i_keyword_structureProperty_plus=document.getElementById(keywordID+"i_keyword_structureProperty_plus")
    let i_keyword_structureProperty_menu=document.getElementById(keywordID+"i_keyword_structureProperty_menu")
    i_keyword_structureProperty_plus.style.display="inline"
    i_keyword_structureProperty_menu.style.display="none"
  }
  //..........addEditButtonProperty  
  const addEditButtonProperty=()=>{
    let study_keywordPropertyStructure_addButton= document.getElementById("study_keywordPropertyStructure_addButton")
    let study_keywordProperty_editButton= document.getElementById("study_keywordProperty_editButton")

    let keyword_propertyName =document.getElementById("study_keywordPropertyName");
    let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
    let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");

    
    keyword_propertyName.value=""
    keyword_propertyValue.value=""
    keyword_propertyUnit.value=""

    study_keywordPropertyStructure_addButton.style.display="inline"
    study_keywordProperty_editButton.style.display="none"
  }
    //..........editAddButtonProperty  
  const editAddButtonProperty=()=>{
    let study_keywordPropertyStructure_addButton= document.getElementById("study_keywordPropertyStructure_addButton")
    let study_keywordProperty_editButton= document.getElementById("study_keywordProperty_editButton")

    study_keywordPropertyStructure_addButton.style.display="none"
    study_keywordProperty_editButton.style.display="inline"
  }
  //..........addEditButtonKeyword  
  const addEditButtonKeyword=()=>{
    let study_keywordStructure_add_i= document.getElementById("study_keywordStructure_add_i")
    let study_keywordStructure_edit_i= document.getElementById("study_keywordStructure_edit_i")

    study_keywordStructure_add_i.style.display="inline"
    study_keywordStructure_edit_i.style.display="none"
  }
   //..........editAddButtonKeyword  
   const editAddButtonKeyword=()=>{
    let study_keywordStructure_add_i= document.getElementById("study_keywordStructure_add_i")
    let study_keywordStructure_edit_i= document.getElementById("study_keywordStructure_edit_i")

    study_keywordStructure_add_i.style.display="none"
    study_keywordStructure_edit_i.style.display="inherit"
  }
   //.........SET i_keyword_structureProperty CLASS
   const structurePropertyIconeSetter1=(i_keyword_structureProperty_plus,i_keyword_structureProperty_menu,keyword)=>{
   if(keyword.keyword_structureProperties.length===0){
    i_keyword_structureProperty_plus.style.display="flex"
    i_keyword_structureProperty_menu.style.display="none"
    }else{
    i_keyword_structureProperty_menu.style.display="flex"    
  }
  }
  //.................DELETE STRUCTURE KEYWORD
  const deleteStrucutreKeywordProperty =(keywordID,keywordStructurePropertyID)=>{
    let url =
    "http://localhost:4000/api/user/deleteKeywordStructureProperty/" +
    props.state.my_id+"/"+keywordID+"/"+keywordStructurePropertyID;
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      return response.json()
    }
  }).then((keywordStructureProperty_object)=>{
    console.log(keywordStructureProperty_object.property)
    document.getElementById(keywordStructurePropertyID + "study_div_menuLiProperty").remove()
    if(keywordStructureProperty_object.length===0) document.getElementById(keywordID+"i_keyword_structureProperty_menu").style.display="none"
  });
  }
   //.................EDIT STRUCTURE KEYWORD
   const editKeywordStructurePropertiesForOneStructure = async(keyword_structureArray)=>{
    setIs_loading(true)
    let url =
    "http://localhost:4000/api/user/editKeywordStructureAfterChangingFunctionName/" +
    props.state.my_id;
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(keyword_structureArray)
  };
  let req = new Request(url, options);
  await fetch(req).then((response)=>{
    if(response.status===201){
      return response.json()
    }
  }).then((response)=>{
    console.log(response)
    retrieveKeywords("Structure",true)
    setIs_loading(false)
  });
  }
  //.................EDIT STRUCTURE KEYWORD
  const editKeywordStructureProperty = async(keyword,keywordStructurePropertyID,body)=>{
    setIs_loading(true)
    let keyword_propertyName =document.getElementById("study_keywordPropertyName");
    let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
    let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");

    let  p_keywordPropertyName=document.getElementById(keywordStructurePropertyID+"p_keywordPropertyName")
    let  p_keywordPropertyValue=document.getElementById(keywordStructurePropertyID+"p_keywordPropertyValue")
    let  p_keywordPropertyUnit=document.getElementById(keywordStructurePropertyID+"p_keywordPropertyUnit")
    let  p_keywordPropertyLevel=document.getElementById(keywordStructurePropertyID+"p_keywordPropertyLevel")
    let  p_keywordPropertyStatus=document.getElementById(keywordStructurePropertyID+"p_keywordPropertyStatus")


  
    let url =
    "http://localhost:4000/api/user/editKeywordStructureProperty/" +
    props.state.my_id+"/"+keyword._id+"/"+keywordStructurePropertyID;
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  };
  let req = new Request(url, options);
  await fetch(req).then((response)=>{
    if(response.status===201){
      document.getElementById("study_writing_keywordProperties_div").style.display="none"
      // p_keywordPropertyName.textContent=keyword_propertyName.value
      // p_keywordPropertyValue.textContent=keyword_propertyValue.value
      // p_keywordPropertyUnit.textContent=keyword_propertyUnit.value
      // p_keywordPropertyStatus.textContent="Physiological"
      return response.json()
    }
  }).then((keywordProperties)=>{
    keyword_propertyName.value=""
    keyword_propertyValue.value=""
    keyword_propertyUnit.value=""
    setIs_loading(false)
    retrieveKeywordProperty(keywordProperties,"Structure")
  });
  }
   //.............EDIT KEYWORD STRUCTURE.................
   const editKeyword = (type,keywordID,body) => {
    console.log(body)
    var structureName_input=document.getElementById("study_keyword_structureName")
    var structureLevel_input=document.getElementById("study_keyword_structureLevel")

    var functionName_input = document.getElementById("study_keyword_functionName")
    var functionType_input = document.getElementById("study_keyword_functionType")

    var structureName_p= document.getElementById(keywordID +"p_keyword_structureName")
    var structureLevel_p= document.getElementById(keywordID +"p_keyword_structureLevelOfStudy")
    
    var functionName_p=document.getElementById(keywordID +"p_keyword_functionName")
    var functionType_p=document.getElementById(keywordID +"p_keyword_functionType")
    var div_keyword_functionSubject=document.getElementById(keywordID+"div_keyword_functionSubject")
    var functionObject_p= document.getElementById(keywordID +"p_keyword_functionObject")

    var addButtonkeywordStructure=document.getElementById("study_keywordStructure_add_i")
    var editButtonkeywordStructure=document.getElementById("study_keywordStructure_edit_i")
    var addButtonkeywordFunction=document.getElementById("study_keywordFunction_add_i")
    var editButtonkeywordFunction=document.getElementById("study_keywordFunction_edit_i")

    let url =
      "http://localhost:4000/api/user/editKeyword/" +
      props.state.my_id+"/"+keywordID+"/"+type;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + props.state.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    };
    let req = new Request(url, options);
    fetch(req).then((response)=>{
      if(response.status===201){
        return response.json()
      }
      }
      ).then((keyword)=>{
      if(type==="Structure"){
        document.getElementById(keywordID + "li").style.backgroundColor="inherit"
        addButtonkeywordStructure.style.display="inherit"
        editButtonkeywordStructure.style.display="none"
      }
      if(type==="Function"){
        //.....TEST........
        updateFunctionStructureProperties(keywordID)
        //...........zeroing
        document.getElementById(keywordID + "li").style.backgroundColor="inherit"
        addButtonkeywordFunction.style.display="inherit"
        editButtonkeywordFunction.style.display="none"
        //....................
        retrieveKeywords("Function",true)
      }
      return keyword
      })
      .then((keyword)=>{
        if(type==="Structure"){
        structureName_input.value=""
        structureLevel_input.value="MCTOSH level"
        retrieveKeywords("Structure",true)
        retrieveKeywordProperty(keyword,"Structure")
      }
      if(type==="Function"){
        document.getElementById("study_functionSubjects_div").style.display="none"
        document.getElementById("study_functionSubjects_div").innerHTML=""
      }
      });
}
  //.............DELETE KEYWORD STRUCTURE.................
  const deleteKeyword = (type,keywordID) => {
    let url =
      "http://localhost:4000/api/user/deleteKeyword/" +
      props.state.my_id+"/"+keywordID+"/"+type;
    let options = {
      method: "POST",
      mode: "cors",
      headers: {
        Authorization: "Bearer " + props.state.token,
        "Content-Type": "application/json",
      },
    };
    let req = new Request(url, options);
    fetch(req).then((response)=>{
      if(response.status===201){
        retrieveKeywords(type,true)
      }
    });
}
  const retrieveKeywords = (type,needFetch,keyword)=>{
    keywordStructureArray=[];
    setIs_loading(true)
    var ul_keywordProperties=document.getElementById("study_keywordProperties_ul")
    var ul_keywordsStructure=document.getElementById("study_keywordsStructure_ul")
    var ul_keywordsFunction=document.getElementById("study_keywordsFunction_ul")

    if(needFetch===true){
      let url =
        "http://localhost:4000/api/user/update/" +
        props.state.my_id;
      let options = {
        method: "GET",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + props.state.token,
          "Content-Type": "application/json",
        },
      };
      let req = new Request(url, options);
      fetch(req).then((response)=>{
        if(response.status===200){
          document.getElementById("study_keywordProperties_div").style.display="none"
          return response.json()
        }}).then((jsonData)=>{
          setIs_loading(false)
          if(type==="propertyObject"){
            propertyObjectsRetrieved= jsonData.study.propertyObjects
            let ul_propertyCustom=document.getElementById("study_settings_content_customize_propertyName_ul")
            let study_keywordPropertyName_select=document.getElementById("study_keywordPropertyName")
            ul_propertyCustom.innerHTML=""
            study_keywordPropertyName_select.innerHTML="<option selected disabled>Property name</option>"
            jsonData.study.propertyObjects.forEach((propertyObject)=>{
              let p_propertyName=document.createElement("p")
              let p_propertyLevel=document.createElement("p")
              let p_propertyDataType=document.createElement("p")
              let p_propertyDomain=document.createElement("p")
              let p_propertyUnit=document.createElement("p")
              let menu_deleteIcon= document.createElement("i");
              let menu_editIcon= document.createElement("i");
              let div_menuIcones_propertyObject=document.createElement("div")
              let div_p_propertyObject=document.createElement("div")
              let li= document.createElement("li");
              menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
              menu_editIcon.setAttribute("class","fa fa-sharp fa-solid fa-pencil");
              li.setAttribute("id",propertyObject._id+"li_propertyObject")
              div_menuIcones_propertyObject.setAttribute("class","fr div_menuIcones_propertyObject")
              li.setAttribute("class","fr")
              div_p_propertyObject.setAttribute("class","div_p_propertyObject")
              menu_deleteIcon.addEventListener("click",()=>{
                deleteCustomize(propertyObject._id,"propertyObject")
              })
              menu_editIcon.addEventListener("click",()=>{
                propertyObjectInEdit=propertyObject
                document.getElementById("study_settings_content_customize_propertyName_input").value=propertyObject.propertyName
                document.getElementById("study_settings_content_customize_propertyLevel_select").value=propertyObject.propertyLevel
                document.getElementById("study_settings_content_customize_propertyDataType_select").value=propertyObject.propertyDataType
                document.getElementById("study_settings_content_customize_propertySet_select").value=propertyObject.propertyDomain
                document.getElementById("study_settings_content_customize_propertyUnit_select").value=propertyObject.propertyUnit
                document.getElementById("study_settings_content_customize_propertyObject_addButton").style.display="none"
                document.getElementById("study_settings_content_customize_propertyObject_editButton").style.display="inline"
                editCustomize(propertyObject._id,"propertyObject")
              })
              //...........UPDATE ADD/EDIT PROPERTYOBJECT BUTTON
              document.getElementById("study_settings_content_customize_propertyObject_addButton").style.display="inline"
              document.getElementById("study_settings_content_customize_propertyObject_editButton").style.display="none"
              //...........
              p_propertyName.textContent=propertyObject.propertyName
              p_propertyLevel.textContent=propertyObject.propertyLevel
              p_propertyDataType.textContent=propertyObject.propertyDataType
              p_propertyDomain.textContent=propertyObject.propertyDomain
              p_propertyUnit.textContent=propertyObject.propertyUnit
              div_menuIcones_propertyObject.append(menu_deleteIcon,menu_editIcon)
              div_p_propertyObject.append(p_propertyName,p_propertyLevel,p_propertyDataType,p_propertyDomain,p_propertyUnit)
              li.append(div_menuIcones_propertyObject,div_p_propertyObject)
              ul_propertyCustom.prepend(li)
            })
            if(jsonData.study.propertyObjects.length==0){
              let p=document.createElement("p")
              let li= document.createElement("li");
              p.textContent="Nothing to show"
              li.setAttribute("class","fr li_nothingToShow")
              li.append(p)
              ul_propertyCustom.prepend(li)
            }
          }
          if(type==="unit_inMemory"){
            unitsInMemoryRetrieved=jsonData.study.inMemory.units
            let unit_customization_select = document.getElementById("study_settings_content_customize_propertyUnit_select")
            unit_customization_select.innerHTML="<option selected disabled>Property unit</option><option>UNITLESS</option>"
            let ul_unit=document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitUl")
            ul_unit.innerHTML=""
            for(var i = 0;i<jsonData.study.inMemory.units.length;i++){
              unit_customization_select.innerHTML+="<option>"+jsonData.study.inMemory.units[i]+"</option>"
              let p_unit=document.createElement("p")
              let menu_deleteIcon= document.createElement("i");
              let li= document.createElement("li");
              menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
              menu_deleteIcon.setAttribute("id",i)
              li.setAttribute("id","li_unit"+"_"+i)
              li.setAttribute("class","fr")
              menu_deleteIcon.addEventListener("click",()=>{
                deleteMemory(menu_deleteIcon.id,"unit_inMemory")
              })
              p_unit.textContent=jsonData.study.inMemory.units[i]
              li.append(menu_deleteIcon,p_unit)
              ul_unit.prepend(li)
            }
            if(jsonData.study.inMemory.units.length==0){
              let p=document.createElement("p")
              let li= document.createElement("li");
              p.textContent="Nothing to show"
              li.setAttribute("class","fr li_nothingToShow")
              li.append(p)
              ul_unit.prepend(li)
            }
          }
          if(type==="dataType_inMemory"){
            dataTypesInMemoryRetrieved=jsonData.study.inMemory.dataTypes
            let dataType_customization_select = document.getElementById("study_settings_content_customize_propertyDataType_select")
            dataType_customization_select.innerHTML="<option selected disabled>Property data type</option>"
            let ul_dataType=document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeUl")
            ul_dataType.innerHTML=""
            for(var i = 0;i<jsonData.study.inMemory.dataTypes.length;i++){
              dataType_customization_select.innerHTML+="<option>"+jsonData.study.inMemory.dataTypes[i]+"</option>"
              let p_dataType=document.createElement("p")
              let menu_deleteIcon= document.createElement("i");
              let menu_editIcon= document.createElement("i");
              let div_menuIcons= document.createElement("div")
              let li= document.createElement("li");
              menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
              menu_deleteIcon.setAttribute("id",i)
              menu_editIcon.setAttribute("class","fa fa-sharp fa-solid fa-pencil");
              menu_editIcon.setAttribute("id",i)
              div_menuIcons.setAttribute("class","div_menuIcons")
              li.setAttribute("id","li_dataType"+"_"+i)
              li.setAttribute("class","fr")
              menu_deleteIcon.addEventListener("click",()=>{
                deleteMemory(menu_deleteIcon.id,"dataType_inMemory")
              })
              menu_editIcon.addEventListener("click",()=>{
                dataTypeinEdit=menu_editIcon.id
                document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeInput").value=jsonData.study.inMemory.dataTypes[menu_editIcon.id]
                document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeAddButton").style.display="none"
                document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeEditButton").style.display="inline"
              })
              p_dataType.textContent=jsonData.study.inMemory.dataTypes[i]
              div_menuIcons.append(menu_deleteIcon,menu_editIcon)
              li.append(div_menuIcons,p_dataType)
              ul_dataType.prepend(li)
            }
            if(jsonData.study.inMemory.dataTypes.length==0){
              let p=document.createElement("p")
              let li= document.createElement("li");
              p.textContent="Nothing to show"
              li.setAttribute("class","fr li_nothingToShow")
              li.append(p)
              ul_dataType.prepend(li)
            }
          }
          if(type==="set_inMemory"){
            setsInMemoryRetrieved=jsonData.study.inMemory.sets
            let set_customization_select = document.getElementById("study_settings_content_customize_propertySet_select")
            set_customization_select.innerHTML="<option selected disabled>Property set</option>"
            let ul_set=document.getElementById("study_settingsCustomization_content_inMemorySets_setUl")
            ul_set.innerHTML=""
            for(var i = 0;i<jsonData.study.inMemory.sets.length;i++){
              set_customization_select.innerHTML+="<option>"+jsonData.study.inMemory.sets[i]+"</option>"
              let p_set=document.createElement("p")
              let menu_deleteIcon= document.createElement("i");
              let li= document.createElement("li");
              menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
              menu_deleteIcon.setAttribute("id",i);
              li.setAttribute("id","li_set"+"_"+i)
              li.setAttribute("class","fr")
              menu_deleteIcon.addEventListener("click",()=>{
                deleteMemory(menu_deleteIcon.id,"set_inMemory")
              })
              p_set.textContent=jsonData.study.inMemory.sets[i]
              li.append(menu_deleteIcon,p_set)
              ul_set.prepend(li)
            }
            if(jsonData.study.inMemory.sets.length==0){
              let p=document.createElement("p")
              let li= document.createElement("li");
              p.textContent="Nothing to show"
              li.setAttribute("class","fr li_nothingToShow")
              li.append(p)
              ul_set.prepend(li)
            }
          }
          // if(type==="functionNature"){
          //   let ul_functionNature=document.getElementById("study_settings_content_customize_functionNature_ul")
          //   let study_keywordFunctionNature_select=document.getElementById("study_keyword_functionNature")
          //   ul_functionNature.innerHTML=""
          //   study_keywordFunctionNature_select.innerHTML="<option selected disabled>Function nature</option>"
          //   jsonData.study.functionNatures.forEach((functionNature)=>{
          //     study_keywordFunctionNature_select.innerHTML+="<option>"+functionNature.name+"</option>"
          //     let p_functionNature=document.createElement("p")
          //     let menu_deleteIcon= document.createElement("i");
          //     let li= document.createElement("li");
          //     menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
          //     li.setAttribute("id",functionNature._id+"li_functionNature")
          //     li.setAttribute("class","fr")
          //     menu_deleteIcon.addEventListener("click",()=>{
          //       deleteCustomize(functionNature._id,"functionNature")
          //     })
          //     p_functionNature.textContent=functionNature.name
          //     li.append(menu_deleteIcon,p_functionNature)
          //     ul_functionNature.prepend(li)
          //   })
          // }
          // if(type==="changeFactor"){
          //   let ul_changeFactor=document.getElementById("study_settings_content_customize_changeFactor_ul")
          //   let study_keywordChangeFactor_select=document.getElementById("study_changeFactor_select")
          //   ul_changeFactor.innerHTML=""
          //   study_keywordChangeFactor_select.innerHTML="<option selected disabled>Change factor</option>"
          //   jsonData.study.changeFactors.forEach((changeFactor)=>{
          //     study_keywordChangeFactor_select.innerHTML+="<option>"+changeFactor.name+"</option>"
          //     let p_changeFactor=document.createElement("p")
          //     let menu_deleteIcon= document.createElement("i");
          //     let li= document.createElement("li");
          //     menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
          //     li.setAttribute("id",changeFactor._id+"li_changeFactor")
          //     li.setAttribute("class","fr")
          //     menu_deleteIcon.addEventListener("click",()=>{
          //       deleteCustomize(changeFactor._id,"changeFactor")
          //     })
          //     p_changeFactor.textContent=changeFactor.name
          //     li.append(menu_deleteIcon,p_changeFactor)
          //     ul_changeFactor.prepend(li)
          //   })
          // }
          if(type==="Structure"){
            if(ul_keywordProperties) ul_keywordProperties.innerHTML=""
            if(ul_keywordsStructure) ul_keywordsStructure.innerHTML=""

            jsonData.study.structure_keywords.forEach((keyword)=>{
            keywordStructureArray.push(keyword)
            let p_keyword_structureName=document.createElement("p")
            let p_keyword_structureStatus=document.createElement("p")
            let p_keyword_structureLevelOfStudy=document.createElement("p")
            let i_keyword_structureProperty_plus=document.createElement("i")
            let i_keyword_structureProperty_menu=document.createElement("i")
            let div_i_keyword_structureProperty=document.createElement("div")
            let li=document.createElement("li")


            let menu_div=document.createElement("div");
            let menu_subdiv=document.createElement("div");
            let menu_showIcon= document.createElement("i");
            let menu_selectIcon= document.createElement("i");
            let menu_deleteIcon= document.createElement("i");
            let menu_editIcon= document.createElement("i");
            let menuLi_div=document.createElement("div")


            p_keyword_structureName.textContent=keyword.keyword_structureName
            p_keyword_structureStatus.textContent=keyword.keyword_structureStatus
            p_keyword_structureLevelOfStudy.textContent=keyword.keyword_structureLevel

            p_keyword_structureStatus.style.color="var(--red)"
            p_keyword_structureName.setAttribute("id",keyword._id +"p_keyword_structureName")
            p_keyword_structureStatus.setAttribute("id",keyword._id +"p_keyword_structureStatus")
            p_keyword_structureLevelOfStudy.setAttribute("id",keyword._id +"p_keyword_structureLevelOfStudy")
            menu_showIcon.setAttribute("class","fa fa-sharp fa-solid fa-bars");
            menu_showIcon.setAttribute("id", keyword._id + "menu_showIcon");
            menu_showIcon.setAttribute("title","")
            menu_editIcon.setAttribute("title","")
            menu_selectIcon.setAttribute("class","fa fa-sharp fa-solid fa-check");
            menu_selectIcon.setAttribute("title","");
            menu_selectIcon.setAttribute("id",keyword._id+"menu_selectIcon")
            menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
            menu_editIcon.setAttribute("class","fa fa-sharp fa-solid fa-pencil");
            menu_div.setAttribute("class","fr keywordsTable_menu_div");
            menu_subdiv.setAttribute("class","fc keywordsTable_menu_subdiv");
            menu_subdiv.setAttribute("id",keyword._id+"menu_subdiv");
            menuLi_div.setAttribute("class","menuLi_div fr")
            menuLi_div.setAttribute("id", keyword._id + "menuLi_div");
            menu_editIcon.setAttribute("id",keyword._id+"menu_editIcon")
            i_keyword_structureProperty_plus.setAttribute("id",keyword._id+"i_keyword_structureProperty_plus")
            i_keyword_structureProperty_menu.setAttribute("id",keyword._id+"i_keyword_structureProperty_menu")
            i_keyword_structureProperty_plus.setAttribute("class","fa fa-solid fa-plus")
            i_keyword_structureProperty_menu.setAttribute("class","fa fa-solid fa-list")
            div_i_keyword_structureProperty.setAttribute("class","fr div_i_keyword_structureProperty")
            li.setAttribute("id",keyword._id+"li")
            li.setAttribute("class","fr study_pkeywordsStructure_div")

            i_keyword_structureProperty_plus.addEventListener("click",()=>{
              keywordStructure=keyword
              document.getElementById("study_writing_keywordProperties_div").style.display="flex"
              document.getElementById("study_keywordPropertyStructure_addButton").style.display="inline"
              document.getElementById("study_keywordPropertyFunction_addButton").style.display="none"

              let study_keywordPropertyName_select = document.getElementById("study_keywordPropertyName")
              study_keywordPropertyName_select.innerHTML="<option selected disabled>Property name</option>"
                for (var i = 0;i< propertyObjectsRetrieved.length;i++){
                  if(keyword.keyword_structureLevel===propertyObjectsRetrieved[i].propertyLevel || propertyObjectsRetrieved[i].propertyLevel==="All"){
                    study_keywordPropertyName_select.innerHTML+="<option>"+propertyObjectsRetrieved[i].propertyName+" ("+propertyObjectsRetrieved[i].propertyDomain+")"+"</option>"
                  }
                }
            })

            i_keyword_structureProperty_menu.addEventListener("click",()=>{
              document.getElementById("study_keywordProperties_div").style.display="flex";
              keywordStructure=keyword
              retrieveKeywordProperty(keyword,"Structure")
            })
            if(keyword.keyword_structureProperties.length===0) i_keyword_structureProperty_menu.style.display="none"



            //.........
            menu_showIcon.addEventListener("click",()=>{
              let menu_subdiv = document.getElementById(keyword._id + "menu_subdiv");
              let menu_subdiv_height=getComputedStyle(menu_subdiv).height
                if(menu_subdiv_height=="0px"){
                  menu_subdiv.style.height="min-content"
                }else{
                  menu_subdiv.style.height=0
                }
              })
              //............
             //  .............EDIT FUNCTION
             menu_editIcon.addEventListener("click", () => {
              keywordStructure=keyword
              var structureName_input=document.getElementById("study_keyword_structureName")
              var structureLevel_input=document.getElementById("study_keyword_structureLevel")
              
              menu_subdiv.style.height="0"
              let li_backgroundColor=getComputedStyle(li).backgroundColor
              if(li_backgroundColor==="rgb(240, 242, 245)"){
                li.style.backgroundColor="#d1fc5e"
                menu_editIcon.style.color="#d1fc5e"
                editAddButtonKeyword()
              }else{
                li.style.backgroundColor="var(--white)"
                menu_editIcon.style.color="var(--white)"
                addEditButtonKeyword()
              }
              if(structureName_input) structureName_input.value=keyword.keyword_structureName
              if(structureLevel_input) structureLevel_input.value=keyword.keyword_structureLevel
            })

          // ................DELETE ONE keyword..........
          menu_deleteIcon.addEventListener("click", () => deleteKeyword("Structure",keyword._id)
          )
          //.................
            div_i_keyword_structureProperty.append(i_keyword_structureProperty_plus,i_keyword_structureProperty_menu)
            menu_subdiv.append(menu_deleteIcon,menu_editIcon)
            menu_div.append(menu_showIcon)
            li.append(p_keyword_structureName,p_keyword_structureStatus,p_keyword_structureLevelOfStudy,div_i_keyword_structureProperty)
            menuLi_div.append(menu_subdiv,menu_div,li)
            ul_keywordsStructure.prepend(menuLi_div)
          })
        }
          if(type==="Function"){
            ul_keywordsFunction.innerHTML=""
            jsonData.study.function_keywords.forEach((keyword)=>{
            let p_keyword_functionName=document.createElement("p")
            let p_keyword_functionNature=document.createElement("p")
            let li=document.createElement("li")
            let menu_div=document.createElement("div");
            let menu_subdiv=document.createElement("div");
            let menu_showIcon= document.createElement("i");
            let menu_selectIcon= document.createElement("i");
            let menu_deleteIcon= document.createElement("i");
            let menu_editIcon= document.createElement("i");
            let menu_workIcon = document.createElement("i");
            let i_keyword_functionProperty_plus=document.createElement("i")
            let i_keyword_functionProperty_menu=document.createElement("i")
            let i_code=document.createElement("i")
            let div_i_keyword_functionProperty=document.createElement("div")
            let menuLi_div=document.createElement("div")
            
    
            div_i_keyword_functionProperty.setAttribute("class","fr div_i_keyword_functionProperty")
            li.setAttribute("class","fr")
            li.setAttribute("id",keyword._id+"li")
            li.setAttribute("class","study_pkeywordsFunction_div")

            p_keyword_functionName.setAttribute("id",keyword._id +"p_keyword_functionName")
            p_keyword_functionNature.setAttribute("id",keyword._id +"p_keyword_functionNature")

            p_keyword_functionName.textContent=keyword.keyword_functionName
            p_keyword_functionNature.textContent=keyword.keyword_functionNature
      
            menu_showIcon.setAttribute("class","fa fa-sharp fa-solid fa-bars");
            menu_showIcon.setAttribute("id", keyword._id + "menu_showIcon");
            menu_selectIcon.setAttribute("class","fa fa-sharp fa-solid fa-check");
            menu_selectIcon.setAttribute("id",keyword._id+"menu_selectIcon")
            menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
            menu_editIcon.setAttribute("class","fa fa-sharp fa-solid fa-pencil");
            menu_workIcon.setAttribute("class","fi fi-rr-settings")
            menu_div.setAttribute("class","fr keywordsTable_menu_div");
            menu_subdiv.setAttribute("class","fc keywordsTable_menu_subdiv");
            menu_subdiv.setAttribute("id",keyword._id+"menu_subdiv");
            menuLi_div.setAttribute("class","menuLi_div fr")
            menuLi_div.setAttribute("id", keyword._id + "menuLi_div");
            menu_editIcon.setAttribute("id",keyword._id+"menu_editIcon")
            i_code.setAttribute("id",keyword._id+"i_code")
            i_code.setAttribute("class","fi fi-rr-file-code")

              //..........properties
            i_keyword_functionProperty_plus.addEventListener("click",()=>{
              keywordFunction=keyword
              document.getElementById("study_writing_keywordProperties_div").style.display="flex"
              document.getElementById("study_keywordPropertyStructure_addButton").style.display="none"
              document.getElementById("study_keywordPropertyFunction_addButton").style.display="inline"
              })

            i_keyword_functionProperty_menu.addEventListener("click",()=>{
              document.getElementById("study_keywordProperties_div").style.display="flex";
              keywordFunction=keyword
              retrieveKeywordProperty(keyword,"Function")
            })
            //...............
            i_code.addEventListener("click",()=>{
              document.getElementById("study_functionCode_div").style.display="flex"
              retrieveFunctionCode(keyword)
            })
            //.......work 
            menu_workIcon.addEventListener("click",()=>{
            let menu_workIcon_color=getComputedStyle(menu_workIcon).color
            if(keywordStructurePropertySelectedSubjectArray.length>0){
              document.getElementById("study_workstation_keywordProperties_input_ul").innerHTML=""
              if(menu_workIcon_color==="rgb(240, 242, 245)"){
              keywordFunction=keyword
              editKeyword("Function",keyword._id,{
                _id:keyword._id,
                keyword_functionName: keyword.keyword_functionName,
                keyword_functionNature:keyword.keyword_functionNature,
                keyword_functionCode:keywordStructurePropertySelectedSubjectArray
              })
              menu_subdiv.style.height="0"
              li.style.backgroundColor="#d1fc5e"
              menu_workIcon.style.color="#d1fc5e"

              document.getElementById("study_workstation_keywordProperties_greeting_ul").style.display="none"
              document.getElementById("study_workstation_keywordProperties_input_ul").style.display="flex"
            }else{
              menu_subdiv.style.height="0"
              li.style.backgroundColor="var(--white)"
              menu_workIcon.style.color="var(--white)"

              document.getElementById("study_workstation_keywordProperties_greeting_ul").style.display="flex"
              document.getElementById("study_workstation_keywordProperties_input_ul").style.display="none"
              document.getElementById("study_workstation_keywordProperties_input_ul").innerHTML=""
              }  
            }else{
              props.serverReply("There is no work saved for this function.")
            }       
            })
            //.......Menu select
              menu_selectIcon.addEventListener("click",()=>{
              let menu_selectIcon_color=getComputedStyle(menu_selectIcon).color
              if(menu_selectIcon_color==="rgb(240, 242, 245)"){
                if(keywordFunction===""){
                props.serverReply("Function selected successfully")  
                menu_selectIcon.style.color="rgb(209, 252, 94)"
                li.style.backgroundColor="rgb(209, 252, 94)"
                menu_subdiv.style.height="0px"
                keywordFunction=keyword
               
                if(keywordStructurePropertySelectedSubjectArray.length>0 || keywordStructurePropertySelectedObjectArray.length>0){
                document.getElementById("study_workstation_keywordProperties_input_ul").innerHTML=""
                for(var i = 0; i< keywordStructurePropertySelectedSubjectArray.length;i++){
                  retrieveSelectedStructuresProperty(keywordStructurePropertySelectedSubjectArray[i],"Subject",keyword,"Structure")
                }
                for(var i = 0; i< keywordStructurePropertySelectedObjectArray.length;i++){
                  retrieveSelectedStructuresProperty(keywordStructurePropertySelectedObjectArray[i],"Object",keyword,"Structure")
                }
              }
              }else{
              props.serverReply("Please unselect the selected function first to be able to select another function")  
              }
              }else{
                props.serverReply("Function unselected successfully")  
                menu_selectIcon.style.color="rgb(240, 242, 245)"
                li.style.backgroundColor="rgb(240, 242, 245)"
                menu_subdiv.style.height="0px"
                keywordFunction=""
                document.getElementById("study_workstation_keywordProperties_input_ul").innerHTML=""
                document.getElementById("study_navFunctionStructure_input_i").style.display="none"
                document.getElementById("study_workstation_keywordProperties_greeting_ul").style.display="flex"
                document.getElementById("study_workstation_keywordProperties_input_ul").style.display="none"
              }
            })
            //.........
            menu_showIcon.addEventListener("click",()=>{
              let menu_subdiv_height=getComputedStyle(menu_subdiv).height
                if(menu_subdiv_height ==="0px"){
                  menu_subdiv.style.height="min-content"
                }else{
                  menu_subdiv.style.height=0
                }
              })
              //............
             //  .............EDIT FUNCTION
             menu_editIcon.addEventListener("click", () => {
              //...................
              var addButton=document.getElementById("study_keywordFunction_add_i")
              var editButton=document.getElementById("study_keywordFunction_edit_i")
              var functionName_input=document.getElementById("study_keyword_functionName")
              var functionNature_input=document.getElementById("study_keyword_functionNature")
              let menu_editIcon_color=getComputedStyle(menu_editIcon).color
              //.................
              if(menu_editIcon_color==="rgb(240, 242, 245)"){
                  //..............
              keywordFunction=keyword

              addButton.style.display="none"
              editButton.style.display="inherit"
              menu_subdiv.style.height="0"
              li.style.backgroundColor="#d1fc5e"
              menu_editIcon.style.color="#d1fc5e"

              functionName_input.value=keyword.keyword_functionName
              functionNature_input.value=keyword.keyword_functionNature
            }else{
              addButton.style.display="inherit"
              editButton.style.display="none"
              menu_subdiv.style.height="0"
              li.style.backgroundColor="var(--white)"
              menu_editIcon.style.color="var(--white)"
              functionName_input.value=""
              functionNature_input.value="Function type"
          
              document.getElementById("study_functionSubjects_div").style.display="none"
              document.getElementById("study_functionSubjects_div").innerHTML=""
              }                  
            })
              // ................DELETE ONE keyword..........
              menu_deleteIcon.addEventListener("click", () => deleteKeyword("Function",keyword._id)
              )
              //.................
            div_i_keyword_functionProperty.append(i_keyword_functionProperty_plus,i_keyword_functionProperty_menu)
            menu_subdiv.append(menu_selectIcon,menu_deleteIcon,menu_editIcon,menu_workIcon)
            menu_div.append(menu_showIcon)
            li.append(p_keyword_functionName,p_keyword_functionNature,i_code)
            menuLi_div.append(menu_subdiv,menu_div,li)
            ul_keywordsFunction.prepend(menuLi_div)
          }
        )}
      });
    }else{
      if(type==="Structure"){
        let p_keyword_structureName=document.createElement("p")
        let p_keyword_structureStatus=document.createElement("p")
        let p_keyword_structureLevelOfStudy=document.createElement("p")
        let i_keyword_structureProperty_plus=document.createElement("i")
        let i_keyword_structureProperty_menu=document.createElement("i")
        let div_i_keyword_structureProperty=document.createElement("div")
        let li=document.createElement("li")


        let menu_div=document.createElement("div");
        let menu_subdiv=document.createElement("div");
        let menu_showIcon= document.createElement("i");
        let menu_selectIcon= document.createElement("i");
        let menu_deleteIcon= document.createElement("i");
        let menu_editIcon= document.createElement("i");
        let menuLi_div=document.createElement("div")


        p_keyword_structureName.textContent=keyword.keyword_structureName
        p_keyword_structureStatus.textContent=keyword.keyword_structureStatus
        p_keyword_structureLevelOfStudy.textContent=keyword.keyword_structureLevel

        p_keyword_structureName.setAttribute("id",keyword._id +"p_keyword_structureName")
        p_keyword_structureStatus.setAttribute("id",keyword._id +"p_keyword_structureStatus")
        p_keyword_structureLevelOfStudy.setAttribute("id",keyword._id +"p_keyword_structureLevelOfStudy")
        menu_showIcon.setAttribute("class","fa fa-sharp fa-solid fa-bars");
        menu_showIcon.setAttribute("id", keyword._id + "menu_showIcon");
        menu_showIcon.setAttribute("title","")
        menu_editIcon.setAttribute("title","")
        menu_selectIcon.setAttribute("class","fa fa-sharp fa-solid fa-check");
        menu_selectIcon.setAttribute("title","");
        menu_selectIcon.setAttribute("id",keyword._id+"menu_selectIcon")
        menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
        menu_editIcon.setAttribute("class","fa fa-sharp fa-solid fa-pencil");
        menu_div.setAttribute("class","fr keywordsTable_menu_div");
        menu_subdiv.setAttribute("class","fc keywordsTable_menu_subdiv");
        menu_subdiv.setAttribute("id",keyword._id+"menu_subdiv");
        menuLi_div.setAttribute("class","menuLi_div fr")
        menuLi_div.setAttribute("id", keyword._id + "menuLi_div");
        menu_editIcon.setAttribute("id",keyword._id+"menu_editIcon")
        i_keyword_structureProperty_plus.setAttribute("id",keyword._id+"i_keyword_structureProperty_plus")
        i_keyword_structureProperty_menu.setAttribute("id",keyword._id+"i_keyword_structureProperty_menu")
        i_keyword_structureProperty_plus.setAttribute("class","fa fa-solid fa-plus")
        i_keyword_structureProperty_menu.setAttribute("class","fa fa-solid fa-list")
        div_i_keyword_structureProperty.setAttribute("class","fr div_i_keyword_structureProperty")
        li.setAttribute("id",keyword._id+"li")
        li.setAttribute("class","fr study_pkeywordsStructure_div")

        i_keyword_structureProperty_plus.addEventListener("click",()=>{
          keywordStructure=keyword
          document.getElementById("study_writing_keywordProperties_div").style.display="flex"
          })

          i_keyword_structureProperty_menu.addEventListener("click",()=>{
          document.getElementById("study_keywordProperties_div").style.display="flex";
          keywordStructure=keyword
          retrieveKeywordProperty(keyword,"Structure")
        })
        if(keyword.keyword_structureProperties.length===0) i_keyword_structureProperty_menu.style.display="none"



        //.........
        menu_showIcon.addEventListener("click",()=>{
          let menu_subdiv = document.getElementById(keyword._id + "menu_subdiv");
          let menu_subdiv_height=getComputedStyle(menu_subdiv).height
            if(menu_subdiv_height=="0px"){
              menu_subdiv.style.height="min-content"
            }else{
              menu_subdiv.style.height=0
            }
          })
          //............
         //  .............EDIT FUNCTION
         menu_editIcon.addEventListener("click", () => {
          keywordStructure=keyword
          var structureName_input=document.getElementById("study_keyword_structureName")
          var structureLevel_input=document.getElementById("study_keyword_structureLevel")
          
          menu_subdiv.style.height="0"
          let li_backgroundColor=getComputedStyle(li).backgroundColor
          if(li_backgroundColor==="rgb(240, 242, 245)"){
            li.style.backgroundColor="#d1fc5e"
            menu_editIcon.style.color="#d1fc5e"
            editAddButtonKeyword()
          }else{
            li.style.backgroundColor="var(--white)"
            menu_editIcon.style.color="var(--white)"
            addEditButtonKeyword()
          }
          if(structureName_input) structureName_input.value=keyword.keyword_structureName
          if(structureLevel_input) structureLevel_input.value=keyword.keyword_structureLevel
        })

      // ................DELETE ONE keyword..........
      menu_deleteIcon.addEventListener("click", () => deleteKeyword("Structure",keyword._id)
      )
      //.................
        div_i_keyword_structureProperty.append(i_keyword_structureProperty_plus,i_keyword_structureProperty_menu)
        menu_subdiv.append(menu_deleteIcon,menu_editIcon)
        menu_div.append(menu_showIcon)
        li.append(p_keyword_structureName,p_keyword_structureStatus,p_keyword_structureLevelOfStudy,div_i_keyword_structureProperty)
        menuLi_div.append(menu_subdiv,menu_div,li)
        ul_keywordsStructure.prepend(menuLi_div)
        setIs_loading(false)
    }
      if(type==="Function"){
        let p_keyword_functionName=document.createElement("p")
        let p_keyword_functionType=document.createElement("p")
        let li=document.createElement("li")
        let menu_div=document.createElement("div");
        let menu_subdiv=document.createElement("div");
        let menu_showIcon= document.createElement("i");
        let menu_selectIcon= document.createElement("i");
        let menu_deleteIcon= document.createElement("i");
        let menu_editIcon= document.createElement("i");
        let menuLi_div=document.createElement("div")

        li.setAttribute("class","fr")
        li.setAttribute("id",keyword._id+"li")
        li.setAttribute("class","study_pkeywordsFunction_div")

        p_keyword_functionName.setAttribute("id",keyword._id +"p_keyword_functionName")
        p_keyword_functionType.setAttribute("id",keyword._id +"p_keyword_functionType")

        p_keyword_functionName.textContent=keyword.keyword_functionName
        p_keyword_functionType.textContent=keyword.keyword_functionType
  
        menu_showIcon.setAttribute("class","fa fa-sharp fa-solid fa-bars");
        menu_showIcon.setAttribute("id", keyword._id + "menu_showIcon");
        menu_selectIcon.setAttribute("class","fa fa-sharp fa-solid fa-check");
        menu_selectIcon.setAttribute("id",keyword._id+"menu_selectIcon")
        menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
        menu_editIcon.setAttribute("class","fa fa-sharp fa-solid fa-pencil");
        menu_div.setAttribute("class","fr keywordsTable_menu_div");
        menu_subdiv.setAttribute("class","fc keywordsTable_menu_subdiv");
        menu_subdiv.setAttribute("id",keyword._id+"menu_subdiv");
        menuLi_div.setAttribute("class","menuLi_div fr")
        menuLi_div.setAttribute("id", keyword._id + "menuLi_div");
        menu_editIcon.setAttribute("id",keyword._id+"menu_editIcon")

        //.......Menu select
        menu_selectIcon.addEventListener("click",()=>{
          let menu_selectIcon_color=getComputedStyle(menu_selectIcon).color
          if(menu_selectIcon_color==="rgb(240, 242, 245)"){
            menu_selectIcon.style.color="rgb(209, 252, 94)"
            li.style.backgroundColor="rgb(209, 252, 94)"
            menu_subdiv.style.height="0px"
            keywordFunction=keyword
            for(var i=0;i<keyword.keyword_functionSubject.length;i++){
              retrieveSelectedStructuresProperty(keyword.keyword_functionSubject[i],"Subject",keyword,"Function")
            }
            for(var i=0;i<keyword.keyword_functionObject.length;i++){
              retrieveSelectedStructuresProperty(keyword.keyword_functionObject[i],"Object",keyword,"Function")
            }
          }else{
            menu_selectIcon.style.color="rgb(240, 242, 245)"
            li.style.backgroundColor="rgb(240, 242, 245)"
            menu_subdiv.style.height="0px"
            keywordFunction=""
            document.getElementById("study_workstation_keywordProperties_input_ul").innerHTML=""
          }
        })
        //.........
        menu_showIcon.addEventListener("click",()=>{
          let menu_subdiv_height=getComputedStyle(menu_subdiv).height
            if(menu_subdiv_height ==="0px"){
              menu_subdiv.style.height="150px"
            }else{
              menu_subdiv.style.height=0
            }
          })
          //............
         //  .............EDIT FUNCTION
         menu_editIcon.addEventListener("click", () => {
          //...................
          var addButton=document.getElementById("study_keywordFunction_add_i")
          var editButton=document.getElementById("study_keywordFunction_edit_i")
          var functionName_input=document.getElementById("study_keyword_functionName")
          var functionType_input=document.getElementById("study_keyword_functionType")
          let menu_editIcon_color=getComputedStyle(menu_editIcon).color
          //.................
          if(menu_editIcon_color==="rgb(240, 242, 245)"){
              //..............
          keywordFunction=keyword

          addButton.style.display="none"
          editButton.style.display="inherit"
          menu_subdiv.style.height="0"
          li.style.backgroundColor="#d1fc5e"
          menu_editIcon.style.color="#d1fc5e"

          functionName_input.value=keyword.keyword_functionName
          functionType_input.value=keyword.keyword_functionType
        }else{
          addButton.style.display="inherit"
          editButton.style.display="none"
          menu_subdiv.style.height="0"
          li.style.backgroundColor="var(--white)"
          menu_editIcon.style.color="var(--white)"
          functionName_input.value=""
          functionType_input.value="Function type"
      
          document.getElementById("study_functionSubjects_div").style.display="none"
          document.getElementById("study_functionSubjects_div").innerHTML=""
          }                  
        })
          // ................DELETE ONE keyword..........
          menu_deleteIcon.addEventListener("click", () => deleteKeyword("Function",keyword._id)
          )
          //.................

        menu_subdiv.append(menu_selectIcon,menu_deleteIcon,menu_editIcon)
        menu_div.append(menu_showIcon)
        li.append(p_keyword_functionName,p_keyword_functionType)
        menuLi_div.append(menu_subdiv,menu_div,li)
        ul_keywordsFunction.prepend(menuLi_div)
        setIs_loading(false)
    }}
  }

 
  const addKeywordStructureProperty=(keyword,type)=>{
    if(type==="Structure"){
    setIs_loading(true)
    let keyword_propertyName =document.getElementById("study_keywordPropertyName");
    let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
    let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");
    var body
    let url =
    "http://localhost:4000/api/user/addKeywordStructureProperties/" +
    props.state.my_id+"/"+ keyword._id;
       body={
        _id:keyword._id+"_property_"+Date.now(),
        keyword_structureName:keyword.keyword_structureName,
        keyword_propertyName:keyword_propertyName.value,
        keyword_propertyValue:keyword_propertyValue.value.charAt(0).toUpperCase() + keyword_propertyValue.value.slice(1),
        keyword_propertyUnit:keyword_propertyUnit.value,
      }
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      return response.json()
    }}
    ).then((keyword)=>{
      document.getElementById("study_writing_keywordProperties_div").style.display="none"
      retrieveKeywordProperty(keyword,"Structure")
      let i_keyword_structureProperty_menu = document.getElementById(keyword._id+"i_keyword_structureProperty_menu")
      i_keyword_structureProperty_menu.addEventListener("click",()=>{
        keywordStructure=keyword
        retrieveKeywordProperty(keyword,"Structure")
      })
      i_keyword_structureProperty_menu.style.display="inherit"
      if(keywordStructureProperty) document.getElementById(keywordStructureProperty._id+"div_menuLi").remove()   
      setIs_loading(false)
    })
  }
  if(type==="Function"){
    setIs_loading(true)
    let keyword_propertyName =document.getElementById("study_keywordPropertyName");
    let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
    let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");
    var body
    let url =
    "http://localhost:4000/api/user/addKeywordFunctionProperties/" +
    props.state.my_id+"/"+ keyword._id;
       body={
        _id:keyword._id+"_property_"+Date.now(),
        keyword_functionName:keyword.keyword_functionName,
        keyword_propertyName:keyword_propertyName.value,
        keyword_propertyValue:keyword_propertyValue.value.charAt(0).toUpperCase() + keyword_propertyValue.value.slice(1),
        keyword_propertyUnit:keyword_propertyUnit.value,
      }
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      return response.json()
    }}
    ).then((keyword)=>{
      document.getElementById("study_writing_keywordProperties_div").style.display="none"
      retrieveKeywordProperty(keyword,"Function")
      let i_keyword_functionProperty_menu = document.getElementById(keyword._id+"i_keyword_functionProperty_menu")
      i_keyword_functionProperty_menu.addEventListener("click",()=>{
        keywordFunction=keyword
        retrieveKeywordProperty(keyword,"Function")
      })
      i_keyword_functionProperty_menu.style.display="inherit"
      setIs_loading(false)
    })
  }
  }

  const retrieveSelectedStructuresProperty=(keyword_structureProperty,typeSO,keyword,typeSF)=>{
        let ul_keywordProperties_greeting=document.getElementById("study_workstation_keywordProperties_greeting_ul")
        let ul_keywordProperties=document.getElementById("study_workstation_keywordProperties_input_ul")

        ul_keywordProperties_greeting.style.display="none"
        ul_keywordProperties.style.display="flex"

        let p_keywordStructureName=document.createElement("p")
        let p_keywordPropertyName=document.createElement("p")
        let p_keywordPropertyValue=document.createElement("p")
        let p_keywordPropertyUnit=document.createElement("p")
        let p_keywordPropertyLevel=document.createElement("p")
        let p_keywordPropertyStatus=document.createElement("p")
        let i_work=document.createElement("i")
        let li_keywordProperty=document.createElement("li")
        let div_menuLi=document.createElement("div")
  
        li_keywordProperty.setAttribute("class","fr li_keywordProperty_2")
        div_menuLi.setAttribute("class","fr div_menuLi_selectedProperty")
        div_menuLi.setAttribute("id",keyword_structureProperty._id+"div_menuLi")
        li_keywordProperty.setAttribute("id",keyword_structureProperty._id+"li")
        i_work.setAttribute("class","fi fi-rr-settings")
        document.getElementById("study_keywordStructureProperties_labelDiv").style.padding=0

        i_work.addEventListener("click",()=>{
          let keyword_propertyName =document.getElementById("study_keywordPropertyName");
          let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
          let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");
  
          let study_keywordPropertyStructure_addButton= document.getElementById("study_keywordPropertyStructure_addButton")
          let study_keywordProperty_editButton= document.getElementById("study_keywordProperty_editButton")
          let study_keywordProperty_workButton= document.getElementById("study_keywordProperty_workButton")
  
          study_keywordPropertyStructure_addButton.style.display="none"
          study_keywordProperty_editButton.style.display="none"
          study_keywordProperty_workButton.style.display="inherit"
  
          document.getElementById("study_writing_keywordProperties_div").style.display="flex"
  
          keyword_propertyName.value=keyword_structureProperty.keyword_propertyName;
          keyword_propertyValue.value=keyword_structureProperty.keyword_propertyValue;
          keyword_propertyUnit.value=keyword_structureProperty.keyword_propertyUnit;

          keywordStructure=keyword
          keywordStructureProperty=keyword_structureProperty
        })
  
        if(typeSF==="Structure") p_keywordStructureName.textContent=keywordFunction.keyword_functionName+" > "+keyword_structureProperty.keyword_structureName
        if(typeSF==="Function") p_keywordStructureName.textContent=keyword_structureProperty.keyword_structureName
        p_keywordPropertyName.textContent=keyword_structureProperty.keyword_propertyName
        p_keywordPropertyValue.textContent=keyword_structureProperty.keyword_propertyValue
        p_keywordPropertyUnit.textContent=keyword_structureProperty.keyword_propertyUnit
        p_keywordPropertyStatus.textContent=typeSO
  
        li_keywordProperty.append(p_keywordStructureName,p_keywordPropertyName,p_keywordPropertyValue,p_keywordPropertyUnit,p_keywordPropertyLevel,p_keywordPropertyStatus)
        if(typeSF==="Structure") div_menuLi.append(i_work,li_keywordProperty)
        if(typeSF==="Function") div_menuLi.append(li_keywordProperty)

        let x=0
        for(var i=0;i<ul_keywordProperties.children.length;i++){
          var liID=ul_keywordProperties.children[i].id
          if(liID.split("li")[0]===keyword_structureProperty._id){
            x++
            ul_keywordProperties.children[i].remove()
          } 
        }
        if(x===0)ul_keywordProperties.prepend(div_menuLi)
  }

  const retrieveFunctionCode=(keyword)=>{
    let ul_functionCode= document.getElementById("study_functionCode_ul")
    ul_functionCode.innerHTML=""
      keyword.keyword_functionCode.forEach((keyword_functionCode)=>{
        let p_keywordStructureName=document.createElement("p")
        let p_keywordPropertyName=document.createElement("p")
        let p_keywordPropertyValue=document.createElement("p")
        let p_keywordPropertyUnit=document.createElement("p")
        let p_keywordPropertyLevel=document.createElement("p")
        let i_changeFactor_plus=document.createElement("i")
        let div_changeFactor=document.createElement("div")
        i_changeFactor_plus.setAttribute("class","fa fa-solid fa-plus")
        let li_keywordProperty=document.createElement("li")
  
        p_keywordStructureName.setAttribute("id",keyword_functionCode._id+"p_keywordStructureName")
        p_keywordPropertyName.setAttribute("id",keyword_functionCode._id+"p_keywordPropertyName")
        p_keywordPropertyValue.setAttribute("id",keyword_functionCode._id+"p_keywordPropertyValue")
        p_keywordPropertyUnit.setAttribute("id",keyword_functionCode._id+"p_keywordPropertyUnit")
        p_keywordPropertyLevel.setAttribute("id",keyword_functionCode._id+"p_keywordPropertyLevel")
        i_changeFactor_plus.setAttribute("id",keyword_functionCode._id+"i_changeFactor_plus")
        div_changeFactor.setAttribute("id",keyword_functionCode._id+"div_changeFactor")
        div_changeFactor.setAttribute("class","fc div_changeFactor")
  
        let i_deleteKeywordProperty=document.createElement("i")
        let i_editKeywordProperty=document.createElement("i")
        let i_selectKeywordProperty_1=document.createElement("i")
        let study_div_i_KeywordProperty=document.createElement("div")
        let study_div_menuLiProperty=document.createElement("div")
  
        i_deleteKeywordProperty.setAttribute("class","fi fi-rr-trash")
        i_editKeywordProperty.setAttribute("class","fi fi-rr-pencil")
        i_selectKeywordProperty_1.setAttribute("class","fa fa-sharp fa-solid fa-check");
        i_selectKeywordProperty_1.setAttribute("id",keyword_functionCode._id+"i_selectKeywordProperty_1");
        study_div_i_KeywordProperty.setAttribute("class","fr study_div_i_KeywordProperty")
        study_div_i_KeywordProperty.setAttribute("id",keyword_functionCode._id+"study_div_menuLiProperty")
        
        if(keywordFuctionPropertySelected){
        if(keyword_functionCode._id===keywordFuctionPropertySelected._id){
          i_selectKeywordProperty_1.style.color="#d1fc5e"
          li_keywordProperty.style.backgroundColor="#d1fc5e"
        }
      }
  
        study_div_menuLiProperty.setAttribute("class","fr study_div_menuLiProperty")

        i_changeFactor_plus.addEventListener("click",()=>{
          document.getElementById("study_writing_changeFactor_div").style.display="flex"
        })
        i_selectKeywordProperty_1.addEventListener("click",()=>{
          document.getElementById("study_navFunctionFunction_input_i").style.display="inherit"
          let i_selectKeywordProperty_1_color=getComputedStyle(i_selectKeywordProperty_1).color
          if(i_selectKeywordProperty_1_color==="rgb(0, 153, 174)"){
            li_keywordProperty.style.backgroundColor="#d1fc5e"
            i_selectKeywordProperty_1.style.color="#d1fc5e"
            keywordFuctionPropertySelected=keyword_functionCode
    }
    })
  
        i_deleteKeywordProperty.addEventListener("click",()=>{
          deleteStrucutreKeywordProperty(keyword._id,keyword_functionCode._id)
        })
        i_editKeywordProperty.addEventListener("click",()=>{
          keywordFunction=keyword
          let keyword_propertyName =document.getElementById("study_keywordPropertyName");
          let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
          let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");
  
          let study_keywordPropertyFunction_addButton= document.getElementById("study_keywordPropertyFunction_addButton")
          let study_keywordProperty_editButton= document.getElementById("study_keywordProperty_editButton")
  
          study_keywordPropertyFunction_addButton.style.display="none"
          study_keywordProperty_editButton.style.display="inherit"
  
          document.getElementById("study_writing_keywordProperties_div").style.display="flex"
  
          keyword_propertyName.value=keyword_functionCode.keyword_propertyName;
          keyword_propertyValue.value=keyword_functionCode.keyword_propertyValue;
          keyword_propertyUnit.value=keyword_functionCode.keyword_propertyUnit;
          
          keywordFunction=keyword
          keywordFunctionProperty=keyword_functionCode
        })
        study_div_menuLiProperty.setAttribute("id",keyword_functionCode._id+"study_div_menuLiProperty")
  
        p_keywordStructureName.textContent=keyword_functionCode.keyword_structureName
        p_keywordPropertyName.textContent=keyword_functionCode.keyword_propertyName
        p_keywordPropertyValue.textContent=keyword_functionCode.keyword_propertyValue
        p_keywordPropertyUnit.textContent=keyword_functionCode.keyword_propertyUnit
  
        div_changeFactor.append(i_changeFactor_plus)
        study_div_i_KeywordProperty.append(i_deleteKeywordProperty,i_editKeywordProperty,i_selectKeywordProperty_1)
        li_keywordProperty.append(p_keywordStructureName,p_keywordPropertyName,p_keywordPropertyValue,p_keywordPropertyUnit,p_keywordPropertyLevel,div_changeFactor)
        study_div_menuLiProperty.append(study_div_i_KeywordProperty,li_keywordProperty)
        ul_functionCode.prepend(study_div_menuLiProperty)
        
      })
    }
  const retrieveKeywordProperty=(keyword, type)=>{
    let ul_keywordProperties=document.getElementById("study_keywordProperties_ul")
    ul_keywordProperties.innerHTML=""
    if(type==="Structure"){
    keyword.keyword_structureProperties.forEach((keyword_structureProperty)=>{
      let p_keywordStructureName=document.createElement("p")
      let p_keywordPropertyName=document.createElement("p")
      let p_keywordPropertyValue=document.createElement("p")
      let p_keywordPropertyUnit=document.createElement("p")
      let p_keywordPropertyLevel=document.createElement("p")
      let p_keywordPropertyStatus=document.createElement("p")
      let li_keywordProperty=document.createElement("li")

      p_keywordStructureName.setAttribute("id",keyword_structureProperty._id+"p_keyword_structureName")
      p_keywordPropertyName.setAttribute("id",keyword_structureProperty._id+"p_keywordPropertyName")
      p_keywordPropertyValue.setAttribute("id",keyword_structureProperty._id+"p_keywordPropertyValue")
      p_keywordPropertyUnit.setAttribute("id",keyword_structureProperty._id+"p_keywordPropertyUnit")
      p_keywordPropertyLevel.setAttribute("id",keyword_structureProperty._id+"p_keywordPropertyLevel")
      p_keywordPropertyStatus.setAttribute("id",keyword_structureProperty._id+"p_keywordPropertyStatus")


      let i_deleteKeywordProperty=document.createElement("i")
      let i_editKeywordProperty=document.createElement("i")
      let i_selectKeywordProperty_1=document.createElement("i")
      let i_selectKeywordProperty_2=document.createElement("i")
      let study_div_i_KeywordProperty=document.createElement("div")
      let study_div_menuLiProperty=document.createElement("div")


      i_deleteKeywordProperty.setAttribute("class","fi fi-rr-trash")
      i_editKeywordProperty.setAttribute("class","fi fi-rr-pencil")
      i_selectKeywordProperty_1.setAttribute("class","fa fa-sharp fa-solid fa-check");
      i_selectKeywordProperty_2.setAttribute("class","fa fa-sharp fa-solid fa-check");
      i_selectKeywordProperty_1.setAttribute("id",keyword_structureProperty._id+"i_selectKeywordProperty_1");
      i_selectKeywordProperty_2.setAttribute("id",keyword_structureProperty._id+"i_selectKeywordProperty_2");
      study_div_i_KeywordProperty.setAttribute("class","fr study_div_i_KeywordProperty")
      study_div_i_KeywordProperty.setAttribute("id",keyword_structureProperty._id+"study_div_menuLiProperty")

      for(var i = 0; i<keywordStructurePropertySelectedSubjectArray.length;i++){
        if(keyword_structureProperty._id===keywordStructurePropertySelectedSubjectArray[i]._id){
          i_selectKeywordProperty_1.style.color="#d1fc5e"
          li_keywordProperty.style.backgroundColor="#d1fc5e"
        }
      }
      for(var i = 0; i<keywordStructurePropertySelectedObjectArray.length;i++){
        if(keyword_structureProperty._id===keywordStructurePropertySelectedObjectArray[i]._id){
          i_selectKeywordProperty_2.style.color="#d1fc5e"
          li_keywordProperty.style.backgroundColor="#d1fc5e"
        }
      }

      study_div_menuLiProperty.setAttribute("class","fr study_div_menuLiProperty")

      i_selectKeywordProperty_1.addEventListener("click",()=>{
        document.getElementById("study_navFunctionStructure_input_i").style.display="inherit"
        let i_selectKeywordProperty_2_color=getComputedStyle(i_selectKeywordProperty_2).color
        if(i_selectKeywordProperty_2_color!=="rgb(209, 252, 94)"){
        let i_selectKeywordProperty_1_color=getComputedStyle(i_selectKeywordProperty_1).color
        if(i_selectKeywordProperty_1_color==="rgb(0, 153, 174)"){
          li_keywordProperty.style.backgroundColor="#d1fc5e"
          i_selectKeywordProperty_1.style.color="#d1fc5e"
          keywordStructurePropertySelectedArray.push(keyword_structureProperty)
          keywordStructurePropertySelectedSubjectArray.push(keyword_structureProperty)
          retrieveSelectedStructuresProperty(keyword_structureProperty,"Subject",keyword,"Structure")
          console.log(keywordStructurePropertySelectedArray)
        }else{
          li_keywordProperty.style.backgroundColor="var(--white)"
          i_selectKeywordProperty_1.style.color="var(--blue4)"
          for(var i = 0; i<keywordStructurePropertySelectedSubjectArray.length;i++){
            if(keyword_structureProperty._id===keywordStructurePropertySelectedArray[i]._id){
              keywordStructurePropertySelectedSubjectArray.splice(i,1)
          }
          }
          for(var i = 0; i<keywordStructurePropertySelectedArray.length;i++){
            if(keyword_structureProperty._id===keywordStructurePropertySelectedArray[i]._id){
              keywordStructurePropertySelectedArray.splice(i,1)
          }
          } 
          if (document.getElementById(keyword_structureProperty._id+"div_menuLi")) document.getElementById(keyword_structureProperty._id+"div_menuLi").remove()          
          console.log(keywordStructurePropertySelectedArray)
      }
  }
  })
    //.....
    i_selectKeywordProperty_2.addEventListener("click",()=>{
      document.getElementById("study_navFunctionStructure_input_i").style.display="inherit"
      let i_selectKeywordProperty_1_color=getComputedStyle(i_selectKeywordProperty_1).color
      if(i_selectKeywordProperty_1_color!=="rgb(209, 252, 94)"){
      let i_selectKeywordProperty_2_color=getComputedStyle(i_selectKeywordProperty_2).color
      if(i_selectKeywordProperty_2_color==="rgb(0, 153, 174)"){
        if(keywordStructurePropertySelectedObjectArray.length===0){
        li_keywordProperty.style.backgroundColor="#d1fc5e"
        i_selectKeywordProperty_2.style.color="#d1fc5e"
        keywordStructurePropertySelectedArray.push(keyword_structureProperty)
        keywordStructurePropertySelectedObjectArray.push(keyword_structureProperty)
        retrieveSelectedStructuresProperty(keyword_structureProperty,"Object",keyword,"Structure")
        console.log(keywordStructurePropertySelectedArray)
        }else{
          props.serverReply("You can't select more that one structure as object.")
        }
      }else{
        li_keywordProperty.style.backgroundColor="var(--white)"
        i_selectKeywordProperty_2.style.color="var(--blue4)"
        for(var i = 0; i<keywordStructurePropertySelectedObjectArray.length;i++){
          if(keyword_structureProperty._id===keywordStructurePropertySelectedObjectArray[i]._id){
          keywordStructurePropertySelectedObjectArray.splice(i,1)
        }
        }
        for(var i = 0; i<keywordStructurePropertySelectedArray.length;i++){
          if(keyword_structureProperty._id===keywordStructurePropertySelectedArray[i]._id){
            keywordStructurePropertySelectedArray.splice(i,1)
        }
        }
        document.getElementById(keyword_structureProperty._id+"div_menuLi").remove()          
        console.log(keywordStructurePropertySelectedArray)
    }
  }
})
        //.........

      i_deleteKeywordProperty.addEventListener("click",()=>{
        deleteStrucutreKeywordProperty(keyword._id,keyword_structureProperty._id)
      })
      i_editKeywordProperty.addEventListener("click",()=>{
        keywordStructure=keyword
        let keyword_propertyName =document.getElementById("study_keywordPropertyName");
        let keyword_propertyValue =document.getElementById("study_keywordPropertyValue");
        let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit");

        let study_keywordPropertyStructure_addButton= document.getElementById("study_keywordPropertyStructure_addButton")
        let study_keywordProperty_editButton= document.getElementById("study_keywordProperty_editButton")

        study_keywordPropertyStructure_addButton.style.display="none"
        study_keywordProperty_editButton.style.display="inherit"

        document.getElementById("study_writing_keywordProperties_div").style.display="flex"

        keyword_propertyName.value=keyword_structureProperty.keyword_propertyName;
        keyword_propertyValue.value=keyword_structureProperty.keyword_propertyValue;
        keyword_propertyUnit.value=keyword_structureProperty.keyword_propertyUnit;
        
        keywordStructure=keyword
        keywordStructureProperty=keyword_structureProperty
      })
      study_div_menuLiProperty.setAttribute("id",keyword_structureProperty._id+"study_div_menuLiProperty")

      p_keywordStructureName.textContent=keyword_structureProperty.keyword_structureName
      p_keywordPropertyName.textContent=keyword_structureProperty.keyword_propertyName
      if(keyword_structureProperty.keyword_propertyName==="COMPONENT"){
        let found = false
        keywordStructureArray.forEach((keyword)=>{
          if(keyword_structureProperty.keyword_propertyValue===keyword.keyword_structureName){
            found = true
          }
        })
        if(found===true){
          p_keywordPropertyValue.textContent=keyword_structureProperty.keyword_propertyValue
        }else{
          p_keywordPropertyValue.style.cursor="pointer"
          p_keywordPropertyValue.style.color="red"
          p_keywordPropertyValue.addEventListener("click",()=>{
            var body={
              keyword_structureName:keyword_structureProperty.keyword_propertyValue,
              keyword_structureStatus:"No statement yet",
              keyword_structureLevel:"?",
              keyword_structureProperties:[]
            }
            addKeyword("Structure",body)
            })
            p_keywordPropertyValue.innerHTML=keyword_structureProperty.keyword_propertyValue+", create?"
          }
      }else{
        p_keywordPropertyValue.textContent=keyword_structureProperty.keyword_propertyValue
      }
      p_keywordPropertyUnit.textContent=keyword_structureProperty.keyword_propertyUnit

      study_div_i_KeywordProperty.append(i_deleteKeywordProperty,i_editKeywordProperty,i_selectKeywordProperty_1,i_selectKeywordProperty_2)
      li_keywordProperty.append(p_keywordStructureName,p_keywordPropertyName,p_keywordPropertyValue,p_keywordPropertyUnit,p_keywordPropertyLevel,p_keywordPropertyStatus)
      study_div_menuLiProperty.append(study_div_i_KeywordProperty,li_keywordProperty)
      ul_keywordProperties.prepend(study_div_menuLiProperty)
      
    })
  }
  }
 //........................ADD MEDSTATEMENT.......................
 const addKeyword = (type,body) => {
  setIs_loading(true)
  var structureName_input=document.getElementById("study_keyword_structureName")
  var structureLevel_input=document.getElementById("study_keyword_structureLevel")


  var functionName_input = document.getElementById("study_keyword_functionName")
  var functionType_input = document.getElementById("study_keyword_functionType")

  var addButtonkeywordStructure=document.getElementById("study_keywordStructure_add_i")
  var editButtonkeywordStructure=document.getElementById("study_keywordStructure_edit_i")
  var addButtonkeywordFunction=document.getElementById("study_keywordFunction_add_i")
  var editButtonkeywordFunction=document.getElementById("study_keywordFunction_edit_i")

  let url =
    "http://localhost:4000/api/user/addKeyword/"+ props.state.my_id+"/"+type;
  let options = {
    method: "POST",
    mode: "cors",
    headers: {
      Authorization: "Bearer " + props.state.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  };
  let req = new Request(url, options);
  fetch(req).then((response)=>{
    if(response.status===201){
      if(type==="Structure"){
      addButtonkeywordStructure.style.display="inherit"
      editButtonkeywordStructure.style.display="none"
      structureName_input.value=""
      structureLevel_input.value=""
      return response.json()
  }
}
  if(type==="Function"){
    addButtonkeywordFunction.style.display="inherit"
    editButtonkeywordFunction.style.display="none"
    functionName_input.value=""
    document.getElementById("study_functionSubjects_div").style.display="none"
    document.getElementById("study_functionSubjects_div").innerHTML=""
    return response.json()
  }
}).then((keyword)=>{
  setIs_loading(false)
  if(type==="Structure"){
  structureName_input.value=""
  structureLevel_input.value="MCTOSH level"
  retrieveKeywords("Function",true)
  retrieveKeywords("Structure",true)
  }
  if(type==="Function"){
    functionName_input.value=""
    retrieveKeywords("Function",true)
    retrieveKeywords("Structure",true)
  }
})
}
  //......................................................

  return (
    <React.Fragment>
    <article id="study_reading_article" className='fc'>
      <section id="study_keywords_section" className='fr'>
      <div className='fc' id="study_keywordsStructure_labelUl_div">
          <div id="study_keywordStructure_labelDiv">
            <label>Structure name</label>
            <label>MCTOSH statement of Creation</label>
            <label>MCTOSH level</label>
            <label>Structure properties</label>
          </div>
          <ul id="study_keywordsStructure_ul" className='fc'></ul>
          <form id="study_keywordsStructure_add_form" className='fr'>
          <section className='fr'>
          <input id="study_keyword_structureName" type="text" placeholder="Structure name"></input>
          <select id="study_keyword_structureLevel">
            <option selected="true" disabled="disabled">
              MCTOSH level
            </option>
            <option>Human level</option>
            <option>System level</option>
            <option>Organ level</option>
            <option>Tissue level</option>
            <option>Cell level</option>
            <option>Molecule level</option>
          </select>
          </section>
          <i id="study_keywordStructure_add_i" class="fa fa-solid fa-plus" onClick={()=>{
              let structureName_input=document.getElementById("study_keyword_structureName")
              let structureLevel_input=document.getElementById("study_keyword_structureLevel")
              if(structureName_input.value==="" || structureLevel_input.value==="MCTOSH level"){
                props.serverReply("Posting failed. Please add the required information")
              }else{
                var body={
                  keyword_structureName:structureName_input.value,
                  keyword_structureStatus:"No statement yet",
                  keyword_structureLevel:structureLevel_input.value,
                  keyword_structureProperties:[]
                }
                addKeyword("Structure",body)
              }
          }}></i>      
          <i id="study_keywordStructure_edit_i" class="fa fa-sharp fa-solid fa-pencil" onClick={()=>{
             let structureName_input=document.getElementById("study_keyword_structureName")
             let structureLevel_input=document.getElementById("study_keyword_structureLevel")
            editKeyword("Structure",keywordStructure._id,{
              keyword_structureName:structureName_input.value,
              keyword_structureStatus:"No statement yet",
              keyword_structureLevel:structureLevel_input.value,
              keyword_structureProperties:keywordStructure.keyword_structureProperties
            })
          }}></i>
          </form>
        </div>
        <div id="study_barrier" className='fc'>
        <i class="fi fi-br-angle-right" onClick={()=>{
          document.getElementById("study_keywordsStructure_labelUl_div").style.width="98vw"
          document.getElementById("study_keywordsFunction_labelUl_div").style.width=0
        }}></i>
        <i class="fi fi-rr-circle-dashed" onClick={()=>{
          document.getElementById("study_keywordsStructure_labelUl_div").style.width="inherit"
          document.getElementById("study_keywordsFunction_labelUl_div").style.width="inherit"
        }}></i>
        <i class="fi fi-br-angle-left" onClick={()=>{
          document.getElementById("study_keywordsStructure_labelUl_div").style.width=0
          document.getElementById("study_keywordsFunction_labelUl_div").style.width="98vw"
        }}></i>
     </div>
        <div className='fc' id="study_keywordsFunction_labelUl_div">
          <div id="study_keywordFunction_labelDiv">
            <label>Function name</label>
            <label>Function nature</label>
            <label>Function code <br/>
              "Subjects"
            </label>
          </div>
          <ul id="study_keywordsFunction_ul" className='fc'>
          </ul>
          <form id="study_keywordsFunction_add_form" className='fr'>
          <section className='fr'>
          <input id="study_keyword_functionName" type="text" placeholder="Function name"></input>
          <select id="study_keyword_functionNature">
            <option selected disabled>Function nature</option>
          </select>
          </section>
          <div id="study_functionSubjects_div" className='fc'></div>
          <i id="study_keywordFunction_add_i" class="fa fa-solid fa-plus" onClick={()=>{
            let study_keyword_functionName=document.getElementById("study_keyword_functionName").value
            let study_keyword_functionNature=document.getElementById("study_keyword_functionNature").value
            var body={
              keyword_functionName: study_keyword_functionName,
              keyword_functionNature: study_keyword_functionNature,
              keyword_functionCode: []
            }
            if(study_keyword_functionName!=="" &&
            study_keyword_functionNature!=="Function nature"){ 
            addKeyword("Function",body)
          }else{
            props.serverReply("Posting failed. Please fill the required info")
          }
          }}></i>
          <i id="study_keywordFunction_edit_i" class="fa fa-sharp fa-solid fa-pencil" onClick={()=>{
            let study_keyword_functionName=document.getElementById("study_keyword_functionName")
            let study_keyword_functionType=document.getElementById("study_keyword_functionType")
             editKeyword("Function",keywordFunction._id,{
              _id:keywordFunction._id,
              keyword_functionName: study_keyword_functionName.value,
              
            })
          }}></i>
          </form>
        </div>     
        <div className='fr' id="study_settings_div">
        <section id="study_settings_door_section" className='fc'>
          <i class="fi fi-rr-brain-circuit" onClick={
          ()=>{
            let content_div= document.getElementById("study_settings_wrapper")
            let door= document.getElementById("study_settings_door_section")
            let study_keywordsStructure_labelUl_div= document.getElementById("study_keywordsStructure_labelUl_div")
            let study_barrier = document.getElementById("study_barrier")
            let study_keywordsFunction_labelUl_div=document.getElementById("study_keywordsFunction_labelUl_div")
            let study_reading_article = document.getElementById("study_reading_article")
            let study_barrier2 = document.getElementById("study_barrier2")

            let content_div_width=getComputedStyle(content_div).width
            if(content_div_width==="0px"){
              content_div.style.width="80vw"
              door.style.backgroundColor="var(--green4)"
              study_keywordsStructure_labelUl_div.style.opacity="0"
              study_barrier.style.opacity="0"
              study_barrier2.style.height="0px"
              study_barrier2.style.minHeight="0px"
              study_keywordsFunction_labelUl_div.style.opacity="0"
              study_reading_article.style.backgroundColor="var(--green3)"
            }else{
              content_div.style.width="0"
              door.style.backgroundColor="var(--blue4)"
              study_keywordsStructure_labelUl_div.style.opacity="1"
              study_barrier.style.opacity="1"
              study_barrier2.style.height="40px"
              study_keywordsFunction_labelUl_div.style.opacity="1"
              study_reading_article.style.backgroundColor="var(--blue4)"
            }
          }
        }></i>  
        </section>
        <article id="study_settings_wrapper" className='fc'>
        <section className='fc' id="study_settingsCustomization_wrapper">
          <div id="study_settingsCustomization_titleWrapper" className='fr'>
            <label>Customize your MCTOSH</label>
            <i class="fi fi-rr-angle-small-down" id="study_settingsCustomization_openIcon" onClick={()=>{
               let content_div= document.getElementById("study_settingsCustomization_contentWrapper")
               let i=document.getElementById("study_settingsCustomization_openIcon")
               let content_div_display=getComputedStyle(content_div).display
               if(content_div_display==="none"){
                 content_div.style.display="flex"
                 i.setAttribute("class","fi fi-rr-angle-small-up")
               }else{
                 content_div.style.display="none"
                 i.setAttribute("class","fi fi-rr-angle-small-down")
               }
              }
            }>
            </i>
          </div>
          <div id="study_settingsCustomization_contentWrapper" className='fc'>
            <section id="study_settingsCustomization_content_inMemoryWrapper" className='fr'>
              <section id="" className='fc study_settingsCustomization_content_inMemoryColumn'>
                {/* DATATYPE (IN MEMORY) */}
                <div id="study_settingsCustomization_content_inMemoryDataTypesWrapper" className='fc'>
                  <label className='study_settingsCustomization_content_inMemoryLabels'>
                    Data types in memory
                  </label>
                  <section className= "fr study_settingsCustomization_content_inMemoryInputWrapper">
                  <input type="text" id="study_settingsCustomization_content_inMemoryDataType_dataTypeInput" placeholder='Data type'/>
                      <button id="study_settingsCustomization_content_inMemoryDataType_dataTypeAddButton"
                      onClick={()=>{
                        let dataType = document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeInput").value
                        addMemory(dataType.toUpperCase(),"dataType_inMemory")
                        }
                      }>add</button>
                        <button id="study_settingsCustomization_content_inMemoryDataType_dataTypeEditButton"
                      onClick={()=>{
                        let dataType = document.getElementById("study_settingsCustomization_content_inMemoryDataType_dataTypeInput").value
                        editMemory(dataType.toUpperCase(),dataTypeinEdit,"dataType_inMemory")
                        }
                      }>edit</button>
                  </section>
                  <ul id="study_settingsCustomization_content_inMemoryDataType_dataTypeUl"></ul>
                </div>
              </section>
              <section id="" className='fc study_settingsCustomization_content_inMemoryColumn'>
                {/* DOMAINS (IN MEMORY) */}
                <div id="study_settingsCustomization_content_inMemorySetsWrapper" className='fc'>
                  <label className='study_settingsCustomization_content_inMemoryLabels'>
                    Sets in memory
                  </label>
                  <input type="text" id="study_settingsCustomization_content_inMemorySets_setInput" placeholder='Set' onKeyUp={(event)=>{
                          event.preventDefault()
                          let item = document.getElementById("study_settingsCustomization_content_inMemorySets_setInput")
                          let ul_item = document.getElementById("study_settingsCustomization_content_inMemorySets_itemsUl")
                          if(event.key==="Enter"){
                            if(ul_item.children.length===0){document.getElementById("study_settingsCustomization_content_inMemorySets_itemsUl").style.display="none"
                          }else{
                            document.getElementById("study_settingsCustomization_content_inMemorySets_itemsUl").style.display="flex"
                          }
                          itemsOfSetInWorkingArray.push(item.value)
                          let p_item = document.createElement("p")
                          let i_delete = document.createElement("i")
                          let li= document.createElement("li")
                          li.setAttribute("class", "fr li_item_setInMemory")
                          i_delete.setAttribute("class","fi fi-rr-trash")
                          p_item.textContent=item.value
                          i_delete.addEventListener("click",()=>{
                            li.remove()
                            itemsOfSetInWorkingArray.splice(itemsOfSetInWorkingArray.indexOf(item.value),1)
                            console.log(itemsOfSetInWorkingArray)
                          })
                          console.log(itemsOfSetInWorkingArray)
                          li.append(i_delete,p_item)
                          ul_item.append(li)
                          item.value=""
                        }
                      }}/>
                  <section className= "fr study_settingsCustomization_content_inMemoryInputWrapper">
                  <ul id="study_settingsCustomization_content_inMemorySets_itemsUl" className='fr'></ul>
                      <button 
                      onClick={()=>{
                        let set = document.getElementById("study_settingsCustomization_content_inMemorySets_setInput").value
                        if(itemsOfSetInWorkingArray.length!==0){
                          let string="{" 
                          for(var i = 0;i<itemsOfSetInWorkingArray.length;i++){
                            if(i==itemsOfSetInWorkingArray.length-1){
                              string+=itemsOfSetInWorkingArray[i]+"}"
                            }else{
                              string+=itemsOfSetInWorkingArray[i]+", "
                            }
                          }
                          addMemory(string.toUpperCase(),"set_inMemory")
                          console.log(string)
                        }
                        }
                      }>add</button>
                  </section>
                
                  <ul id="study_settingsCustomization_content_inMemorySets_setUl"></ul>
                </div>
                <div id="study_settingsCustomization_content_inMemoryIntervalsWrapper" className='fc'>
                  <label className='study_settingsCustomization_content_inMemoryLabels'>
                    Intervals in memory
                  </label>
                  <input type="text" id="study_settingsCustomization_content_inMemorySets_setInput" placeholder='Set' onKeyUp={(event)=>{
                          event.preventDefault()
                          let item = document.getElementById("study_settingsCustomization_content_inMemorySets_setInput")
                          let ul_item = document.getElementById("study_settingsCustomization_content_inMemorySets_itemsUl")
                          if(event.key==="Enter"){
                            if(ul_item.children.length===0){document.getElementById("study_settingsCustomization_content_inMemorySets_itemsUl").style.display="none"
                          }else{
                            document.getElementById("study_settingsCustomization_content_inMemorySets_itemsUl").style.display="flex"
                          }
                          itemsOfSetInWorkingArray.push(item.value)
                          let p_item = document.createElement("p")
                          let i_delete = document.createElement("i")
                          let li= document.createElement("li")
                          li.setAttribute("class", "fr li_item_setInMemory")
                          i_delete.setAttribute("class","fi fi-rr-trash")
                          p_item.textContent=item.value
                          i_delete.addEventListener("click",()=>{
                            li.remove()
                            itemsOfSetInWorkingArray.splice(itemsOfSetInWorkingArray.indexOf(item.value),1)
                            console.log(itemsOfSetInWorkingArray)
                          })
                          console.log(itemsOfSetInWorkingArray)
                          li.append(i_delete,p_item)
                          ul_item.append(li)
                          item.value=""
                        }
                      }}/>
                  <section className= "fr study_settingsCustomization_content_inMemoryInputWrapper">
                  <ul id="study_settingsCustomization_content_inMemorySets_itemsUl" className='fr'></ul>
                      <button 
                      onClick={()=>{
                        let set = document.getElementById("study_settingsCustomization_content_inMemorySets_setInput").value
                        if(itemsOfSetInWorkingArray.length!==0){
                          let string="{" 
                          for(var i = 0;i<itemsOfSetInWorkingArray.length;i++){
                            if(i==itemsOfSetInWorkingArray.length-1){
                              string+=itemsOfSetInWorkingArray[i]+"}"
                            }else{
                              string+=itemsOfSetInWorkingArray[i]+", "
                            }
                          }
                          addMemory(string.toUpperCase(),"set_inMemory")
                          console.log(string)
                        }
                        }
                      }>add</button>
                  </section>
                
                  <ul id="study_settingsCustomization_content_inMemorySets_setUl"></ul>
                </div>
              </section>
              <section id="" className='fc study_settingsCustomization_content_inMemoryColumn'>
                 {/* UNITS (IN MEMORY) */}
              <div id="study_settingsCustomization_content_inMemoryUnitsWrapper" className='fc'>
                <label className='study_settingsCustomization_content_inMemoryLabels'>
                  Units in memory
                </label>
                <section className= "fr study_settingsCustomization_content_inMemoryInputWrapper">
                  <input id="study_settingsCustomization_content_inMemoryUnit_unitInput" placeholder='Unit' onChange={()=>{
                  let ul_unit = document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitUl")
                  let unit_input = document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitInput").value.toUpperCase()
                  for(var i = 0;i<unitsInMemoryRetrieved.length;i++){
                    if(unitsInMemoryRetrieved[i].includes(unit_input)){
                        ul_unit.innerHTML=""
                        let p_unit=document.createElement("p")
                        let menu_deleteIcon= document.createElement("i");
                        let li= document.createElement("li");
                        menu_deleteIcon.setAttribute("class","fa fa-sharp fa-solid fa-trash");
                        menu_deleteIcon.setAttribute("id",i)
                        li.setAttribute("id","li_unit"+"_"+i)
                        li.setAttribute("class","fr")
                        menu_deleteIcon.addEventListener("click",()=>{
                          deleteMemory(menu_deleteIcon.id,"unit_inMemory")
                        })
                        p_unit.textContent=unitsInMemoryRetrieved[i]
                        li.append(menu_deleteIcon,p_unit)
                        ul_unit.prepend(li)
                    }
                    if(unit_input==="")retrieveKeywords("unit_inMemory",true)
                  }
                }}></input>
                    <button onClick={()=>{
                      let unit = document.getElementById("study_settingsCustomization_content_inMemoryUnit_unitInput").value
                      addMemory(unit.toUpperCase(),"unit_inMemory")
                      }
                    }>add</button>
                </section>
                <ul id="study_settingsCustomization_content_inMemoryUnit_unitUl"></ul>
              </div>
              </section>
            </section>
            <section id="study_settings_content_customize_propertyName_div" className='fc'>
              <label className='study_settingsCustomization_content_inMemoryLabels'>
                Add a property
              </label>
            <div className='fr study_settings_content_customize_propertyObject_mainContent'>
              <section className= "study_settings_content_inputPanel_section">
                  <input id="study_settings_content_customize_propertyName_input" placeholder='Property name'></input>
                  <select id="study_settings_content_customize_propertyLevel_select">
                    <option selected="true" disabled="disabled">
                      Property level
                    </option>
                    <option>All</option>
                    <option>Human level</option>
                    <option>System level</option>
                    <option>Organ level</option>
                    <option>Tissue level</option>
                    <option>Cell level</option>
                    <option>Molecule level</option>
                  </select> 
                  <select id="study_settings_content_customize_propertyDataType_select">
                    <option selected="true" disabled="disabled">
                      Property data type
                    </option>
                  </select> 
                  <select id="study_settings_content_customize_propertySet_select">
                    <option selected disabled>Property range</option>
                  </select>
                <div id="study_settings_content_customize_propertyUnit_container_div" className='fc'>
                  <select id="study_settings_content_customize_propertyUnit_select" >
                    <option selected disabled>Property unit</option>
                  </select>
                  <div id="study_settings_content_customize_propertyUnit_ulContainer_div">
                    <ul id="study_settings_content_customize_propertyUnit_viewing" className='fr'></ul>
                  </div>
                </div>
            </section>
            <section id="study_settings_content_customize_propertyObject_buttonContainer_section" className='fc'>
            <button id="study_settings_content_customize_propertyObject_addButton" onClick={()=>{
                  let propertyName=document.getElementById("study_settings_content_customize_propertyName_input").value
                  let propertyLevel=document.getElementById("study_settings_content_customize_propertyLevel_select").value
                  let propertyDataType_select=document.getElementById("study_settings_content_customize_propertyDataType_select").value
                  let propertyDomain_select=document.getElementById("study_settings_content_customize_propertySet_select").value
                  let propertyUnit_select=document.getElementById("study_settings_content_customize_propertyUnit_select").value
                    addCustomize(
                    {
                    propertyName:propertyName.toUpperCase(),
                    propertyLevel:propertyLevel.toUpperCase(),
                    propertyDataType:propertyDataType_select,
                    propertyDomain:propertyDomain_select,
                    propertyUnit:propertyUnit_select,
                    }
                  ,
                  "propertyObject")
                }
                }>add</button>
                 <button id="study_settings_content_customize_propertyObject_editButton" onClick={()=>{
                  let unitArray=[]
                  let propertyName=document.getElementById("study_settings_content_customize_propertyName_input").value
                  let propertyDomain=document.getElementById("study_settings_content_customize_propertySet_select").value
                  let propertyLevel=document.getElementById("study_settings_content_customize_propertyLevel_select").value
          
                  for (var i = 0;i<unitsInMemoryRetrieved.length;i++){
                    if(propertyObjectInEdit.propertyName===unitsInMemoryRetrieved[i].propertyName){
                      unitArray.push({
                        propertyName:propertyName,
                        propertyUnit:unitsInMemoryRetrieved[i].propertyUnit
                      })
                    }else{
                      unitArray.push(unitsInMemoryRetrieved[i])
                    }
                  }
                  editPropertyObjectAndUnitCustomize({
                    propertyObject:{
                      _id:propertyObjectInEdit._id,
                      propertyName:propertyName,
                      propertyDomain:propertyDomain,
                      propertyLevel:propertyLevel
                    },
                    propertyUnit:unitArray,
                  })
                  }
                }>Edit</button>
            </section>
            </div>
            <div id="study_settings_content_customize_property_title" className='fr'>
                <label>Property name</label>
                <label>Property level</label>
                <label>Property data type</label>
                <label>Property domain</label>
                <label>Property unit</label>
            </div>
            <ul id="study_settings_content_customize_propertyName_ul"></ul>
            </section>
            {/* <div id="study_settings_content_customize_functionNature_div" className='fc'>
              <label className='study_settingsCustomization_content_inMemoryLabels'>
                Add a function nature
              </label>
              <section className= "fr study_settings_content_inputPanel_section">
              <input id="study_settings_content_customize_functionNature_input" placeholder='Function nature'></input>
              <button onClick={()=>{
                let functionNature=document.getElementById("study_settings_content_customize_functionNature_input").value
                addCustomize({
                  functionNature:functionNature,
                  },"functionNature")
                }
              }>add</button>
            </section>
            <ul id="study_settings_content_customize_functionNature_ul"></ul>
            </div> */}
            {/* <div id="study_settings_content_customize_changeFactor_div" className='fc'>
              <label>
                Add a change factor
              </label>
              <section className= "fr study_settings_content_inputPanel_section">
                <input id="study_settings_content_customize_changeFactor_input" placeholder='Change factor'></input>
                <button onClick={()=>{
                  let x=document.getElementById("study_settings_content_customize_changeFactor_input").value
                  addCustomize(x.toUpperCase(),"changeFactor")
                  }
                }>add</button>
              </section>
              <ul id="study_settings_content_customize_changeFactor_ul"></ul>
            </div> */}
          </div>
        </section>
        </article>      
        </div>
      </section>
      <div id="study_barrier2" className='fr'>
      <i class="fi fi-br-angle-up" onClick={()=>{
        document.getElementById("study_workstation_section").style.display="flex"
        document.getElementById("study_keywords_section").style.display="none"
        }}></i>
      <i class="fi fi-rr-circle-dashed" onClick={()=>{
        document.getElementById("study_workstation_section").style.display="flex"
        document.getElementById("study_keywords_section").style.display="flex"
        }}></i>
      <i class="fi fi-br-angle-down" onClick={()=>{
        document.getElementById("study_workstation_section").style.display="none"
        document.getElementById("study_keywords_section").style.display="flex"
        }}></i>
        </div>  
      <section id="study_workstation_section" className='fr'>
      <div id="study_workstation_keywordProperties_div" className='fc'>
      <label id="study_workstation_keywordProperties_title_label">MCTOSH medical statement</label>
      <nav className="fr" id="study_workstation_keywordProperties_nav">
      <div className="fr div_navFunctionStructure" onClick={()=>{
            if(keywordFunction && keywordStructurePropertySelectedArray.length===0 ){
              props.serverReply("Please select structure(s) as input for your selected function")
            }
            if(!keywordFunction && keywordStructurePropertySelectedArray.length>0 ){
              props.serverReply("Please select function for your selected structure(s) as input")
            }
            if(!keywordFunction && keywordStructurePropertySelectedArray.length===0 ){
              props.serverReply("Please select function and structure(s) as input")
            }
            if(keywordFunction && keywordStructurePropertySelectedArray.length>0){
            let body={
              _id:keywordFunction._id,
              keyword_functionName: keywordFunction.keyword_functionName,
              keyword_functionType: keywordFunction.keyword_functionType,
              keyword_functionSubject: keywordStructurePropertySelectedSubjectArray,
              keyword_functionObject: keywordStructurePropertySelectedObjectArray,
              
            }
            editKeyword("Function",keywordFunction._id,body)
          }
            }}>
            <i class="fi fi-br-briefcase-arrow-right i_navFunctionStructure"></i>
            <p>Show statements</p>
          </div>
          <div className="fr div_navFunctionStructure" onClick={()=>{
            if(keywordFunction && keywordStructurePropertySelectedArray.length===0 ){
              props.serverReply("Please select structure(s) as input for your selected function")
            }
            if(!keywordFunction && keywordStructurePropertySelectedArray.length>0 ){
              props.serverReply("Please select function for your selected structure(s) as input")
            }
            if(!keywordFunction && keywordStructurePropertySelectedArray.length===0 ){
              props.serverReply("Please select function and structure(s) as input")
            }
            if(keywordFunction && keywordStructurePropertySelectedArray.length>0){
            let body={
              _id:keywordFunction._id,
              keyword_functionName: keywordFunction.keyword_functionName,
              keyword_functionType: keywordFunction.keyword_functionType,
              keyword_functionSubject: keywordStructurePropertySelectedSubjectArray,
              keyword_functionObject: keywordStructurePropertySelectedObjectArray,
              
            }
            editKeyword("Function",keywordFunction._id,body)
          }
            }}>
            <i class="fi fi-br-briefcase-arrow-right i_navFunctionStructure"></i>
            <p>Save statement</p>
          </div>
          <div className="fr div_navFunctionStructure" id="study_navFunctionStructure_clear_i" onClick={()=>{
          document.getElementById("study_workstation_keywordProperties_greeting_ul").style.display="flex"
          document.getElementById("study_workstation_keywordProperties_input_ul").style.display="none"
          document.getElementById("study_workstation_keywordProperties_input_ul").innerHTML=""
          document.getElementById("study_navFunctionStructure_input_i").style.backgroundColor="var(--blue4)"
          document.getElementById("study_navFunctionStructure_input_i").style.display="none"
          keywordStructurePropertySelectedArray=[]
          keywordStructurePropertySelectedSubjectArray=[]
          keywordStructurePropertySelectedObjectArray=[]
          retrieveKeywords("Structure",true)
          retrieveKeywords("Function",true)
          }}>
            <i class="fi fi-rr-broom"></i>
            <p>Clear statement</p>
          </div>
          <div className="fr div_navFunctionStructure" id="study_navFunctionStructure_input_i" onClick={()=>{
          document.getElementById("study_workstation_keywordProperties_greeting_ul").style.display="none"
          document.getElementById("study_workstation_keywordProperties_input_ul").style.display="flex"
          document.getElementById("study_navFunctionStructure_input_i").style.backgroundColor="var(--blue5)"

          }}>
          <i class="fi fi-br-inbox-in"></i>
            <p>Input</p>
          </div>
        </nav>
        <div id="study_workstation_keywordStructureProperties_labelDiv">
            <label>Structure name</label>
            <label>Property name</label>
            <label>Property value</label>
            <label>Property unit</label>
        </div>
        <ul id="study_workstation_keywordProperties_input_ul" className='fc'></ul>
        <ul className='fc' id="study_workstation_keywordProperties_greeting_ul">Nothing to show</ul>
    </div>
      </section>
  </article>
    <div id="study_writing_keywordProperties_div" className="fc">
    <button id="study_writing_close_button" onClick={()=>{
        document.getElementById("study_writing_keywordProperties_div").style.display="none";
      }
      }>Close</button>
      <form id="study_writing_keywordProperties_form" className='fc'>
            <div id="study_writing_keywordProperties_form_div">
          <select id="study_keywordPropertyName"onClick={()=>{
            let study_keywordPropertyUnit_select = document.getElementById("study_keywordPropertyUnit")
            let study_keywordPropertyName_input = document.getElementById("study_keywordPropertyName")
            study_keywordPropertyUnit_select.innerHTML="<option selected disabled>Unit</option>"
              for (var i = 0;i< unitsInMemoryRetrieved.length;i++){
                if(study_keywordPropertyName_input.value===unitsInMemoryRetrieved[i].propertyName || unitsInMemoryRetrieved[i].propertyName==="All"){
                  study_keywordPropertyUnit_select.innerHTML+="<option>"+unitsInMemoryRetrieved[i].propertyUnit+"</option>"
                }
              }
            }} ></select>
          <select id="study_keywordPropertyUnit"></select>
          <section id="study_keywordPropertyValue_section">
          <input type="text" id="study_keywordPropertyValue" placeholder="Value"></input>
          <select id="study_keywordPropertyValue_smart"></select>
          </section>
          </div>
      </form>
        <button id="study_keywordPropertyStructure_addButton" onClick={()=>{
         let keyword_propertyName =document.getElementById("study_keywordPropertyName").value;
         let keyword_propertyValue =document.getElementById("study_keywordPropertyValue").value;
         let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit").value;

         if(keyword_propertyName==="" ||
            keyword_propertyValue==="" ||
            keyword_propertyUnit===""
          ){
          props.serverReply("Adding failed. Please fill out the required information")
      }else{
        addKeywordStructureProperty(keywordStructure,"Structure")
      }
        }}>Add</button>
        <button id="study_keywordPropertyFunction_addButton" onClick={()=>{
         let keyword_propertyName =document.getElementById("study_keywordPropertyName").value;
         let keyword_propertyValue =document.getElementById("study_keywordPropertyValue").value;
         let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit").value;

         if(keyword_propertyName==="" ||
            keyword_propertyValue==="" ||
            keyword_propertyUnit===""
         ){
          props.serverReply("Adding failed. Please fill out the required information")
      }else{
        addKeywordStructureProperty(keywordFunction,"Function")
      }
        }}>Add</button>
      <button id="study_keywordProperty_editButton" onClick={()=>{ 
        let keyword_propertyName =document.getElementById("study_keywordPropertyName").value;
        let keyword_propertyValue =document.getElementById("study_keywordPropertyValue").value;
        let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit").value;

        if(keyword_propertyName==="" ||
          keyword_propertyValue==="" ||
          keyword_propertyUnit==="" 
        ){
        props.serverReply("Adding failed. Please fill out the required information")
        }else{
          let body = {
            _id:keywordStructureProperty._id,
            keyword_functionID:keywordFunction._id,
            keyword_structureName:keywordStructure.keyword_structureName,
            keyword_propertyName:keyword_propertyName,
            keyword_propertyValue:keyword_propertyValue,
            keyword_propertyUnit:keyword_propertyUnit,
          }
          editKeywordStructureProperty(keywordStructure,keywordStructureProperty._id,body)      
        }
      }}>Edit</button>
      <button id="study_keywordProperty_workButton" onClick={()=>{ 
        let keyword_propertyName =document.getElementById("study_keywordPropertyName").value;
        let keyword_propertyValue =document.getElementById("study_keywordPropertyValue").value;
        let keyword_propertyUnit =document.getElementById("study_keywordPropertyUnit").value;

        if(keyword_propertyName==="" ||
          keyword_propertyValue==="" ||
          keyword_propertyUnit==="" 
        ){
        props.serverReply("Adding failed. Please fill out the required information")
        }else{
          addKeywordStructureProperty(keywordStructure,"Structure")      
        }
      }}>Work</button>
    </div>
    <div id="study_keywordProperties_div" className='fc'>
    <button id="study_keywordProperties_close_button" onClick={()=>{
        document.getElementById("study_keywordProperties_div").style.display="none";
      }
      }>Close</button>
        <label>Keyword properties</label>
        <form className='fr'>
          <input type='text' placeholder='Search'></input>
          <button id="study_keywordProperties_search_button">Search</button>
        </form>
        <div id="study_keywordStructureProperties_labelDiv">
            <label style={{backgroundColor:"#ff6651"}}>Structure name</label>
            <label>Property name</label>
            <label>Property value</label>
            <label>Property unit</label>
        </div>
        <ul id="study_keywordProperties_ul" className='fc'></ul>
    </div>
    <div id="study_functionCode_div" className='fc'>
    <button id="study_functionCode_close_button" onClick={()=>{
        document.getElementById("study_functionCode_div").style.display="none";
      }
      }>Close</button>
        <label>Function code</label>
        <form className='fr'>
          <input type='text' placeholder='Search'></input>
          <button id="study_functionCode_div">Search</button>
        </form>
        <div id="study_functionCode_labelDiv">
            <label>Structure name</label>
            <label>Property name</label>
            <label>Property value</label>
            <label>Property unit</label>
            <label style={{backgroundColor:"#ff6651"}}>Change factor</label>
        </div>
        <ul id="study_functionCode_ul" className='fc'></ul>
    </div>
    <div className='fr' id='study_writing_changeFactor_div'>
    <button id="study_changeFactor_close_button" onClick={()=>{
        document.getElementById("study_writing_changeFactor_div").style.display="none";
      }
      }>Close</button>
        <form className='fr'>
          <select type='text' placeholder='Change factor' id="study_changeFactor_select">
            <option selected disabled>Change tool</option>
          </select>

          <button id="study_writing_changeFactor_add_button">Add</button>
        </form>
    </div>
    {is_loading === true && (
            <div id="Study_loaderImg_div" className="fc loaderImg_div">
              <img src="/img/loader.gif" alt="" width="100px" />
            </div>
          )}
  </React.Fragment>
  )
}

export default Study
