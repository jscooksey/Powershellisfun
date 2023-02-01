/******************************************************************************
 *                    Copyright 2010-2013 Monotype Imaging Inc.
 *
 *  File...: constraints.js
 *
 *  Remarks: 
 *
 *****************************************************************************/
var psfPrefix = "psf";
var pskPrefix = "psk";
var xsdPrefix = "xsd";
var xsiPrefix = "xsi";
var mtiPrefix = "ns0000";
var oemPrefix = "oem";
var pskNs = "http://schemas.microsoft.com/windows/2003/08/printing/printschemakeywords";
var psfNs = "http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework";
var mtiNs = "http://schemas.monotypeimaging.com/ptpc/2006/1";
var xsdNs = "http://www.w3.org/2001/XMLSchema";
var xsiNs = "http://www.w3.org/2001/XMLSchema-instance";
var oemNs = "http://schemas.monotypeimaging.com/ptpc/oem/1"
var devmodeNs = "http://schemas.microsoft.com/windows/2011/08/printing/devmodemap"
var hexPattern = "0123456789ABCDEF";


function validatePrintTicket(printTicket, scriptContext) {
  /// <param name="printTicket" type="IPrintSchemaTicket">
  ///     Print ticket to be validated.
  /// </param>
  /// <param name="scriptContext" type="IPrinterScriptContext">
  ///     Script context object.
  /// </param>
  /// <returns type="Number" integer="true">
  ///     Integer value indicating validation status.
  ///         retval 1 - Print ticket is valid and was not modified.
  ///         retval 2 - Print ticket was modified to make it valid.
  ///         retval 0 - Print ticket is invalid.
  /// </returns>
    var retVal = 1;
    var printerInit = printTicket.GetFeature("JobPrinterInitialization", mtiNs);
    if (printerInit) {
        var initVal = printerInit.SelectedOption.Name;
        if (initVal == "NOTDONE") {
            // do init if needed
            var queprop = scriptContext.QueueProperties.GetString("Config:DuplexUnit");
            //Fix for EPEAT and EUPLOT issue on USB
            if(queprop && queprop == "NotInstalled") {
                //If DuplexUnit is NotInstalled during install time,
                //then sleep for 5 seconds and check the DuplexUnit again to overcome the duplex response delay.
                sleep(5000);
                queprop = scriptContext.QueueProperties.GetString("Config:DuplexUnit");
            }
            if (queprop) {
                if (queprop == "NotInstalled") {

                    var duplexPrinting = printTicket.GetFeature("JobDuplexAllDocumentsContiguously", pskNs);
                    var duplexOptions = printTicket.GetCapabilities().GetOptions(duplexPrinting);
                    if (duplexPrinting.SelectedOption.Name != duplexOptions.GetAt(0).Name) {

                        duplexPrinting.SelectedOption = duplexOptions.GetAt(0);
                    }
				}
			//if duplex unit is installed set option as yes flip over for worldwide option support.		
		else if (queprop == "Installed") {

                    var duplexPrinting = printTicket.GetFeature("JobDuplexAllDocumentsContiguously", pskNs);
                    var duplexOptions = printTicket.GetCapabilities().GetOptions(duplexPrinting);
                    if (duplexPrinting.SelectedOption.Name != duplexOptions.GetAt(1).Name) {

                        duplexPrinting.SelectedOption = duplexOptions.GetAt(1);
                    }
                }
            }
            var initOptions = printTicket.GetCapabilities().GetOptions(printerInit);
            printerInit.SelectedOption = initOptions.GetAt(1);
            // Change default source to "Printer Auto Select
            var paperSource = printTicket.GetFeature("JobInputBin", pskNs);
            var paperSourceOptions = printTicket.GetCapabilities().GetOptions(paperSource);
            if (paperSource.SelectedOption.Name == paperSourceOptions.GetAt(0).Name) {
                paperSource.SelectedOption = paperSourceOptions.GetAt(1);
            }
            printTicket.NotifyXmlChanged();
            retVal = 2;
        }
    }

    return retVal;
}

function completePrintCapabilities(printTicket, scriptContext, printCapabilities) {
  /// <param name="printTicket" type="IPrintSchemaTicket" mayBeNull="true">
  ///     If not 'null', the print ticket's settings are used to customize the print capabilities.
  /// </param>
  /// <param name="scriptContext" type="IPrinterScriptContext">
  ///     Script context object.
  /// </param>
  /// <param name="printCapabilities" type="IPrintSchemaCapabilities">
  ///     Print capabilities object to be customized.
  /// </param>
  ///debugger;
  if (printTicket) {
    setSelectionNamespace(
    printTicket.XmlNode,
    psfPrefix,
    psfNs);
  }
  setSelectionNamespace(
      printCapabilities.XmlNode,
      psfPrefix,
      psfNs);
  /*
  var ticketPskPrefix = getPrefixForNamespace(printCapabilities.XmlNode, pskNs);
  var pageScalingFeatureXmlNode = printTicket.GetFeature("PageScaling");
  var done = false;
  var zooming = false;
  */
  
  var dom = printCapabilities.XmlNode;
  var rootElement = printCapabilities.XmlNode.documentElement;

  // <psf:ParameterRef name="psk:PageScalingScale"> ....</psf:ParameterRef>
  completePageScaling(rootElement, dom);
  addPageScalingScaleDef(rootElement, dom);
  completeDocumentNUp(rootElement, dom);
  addDocumentNUpPageBorderWidthDef(rootElement, dom);
  addDocumentNUpPageBorderDashLengthDef(rootElement, dom);
  addDocumentNUpPageBorderLengthDef(rootElement, dom);
 // CompleteDuplex(rootElement, dom, scriptContext);
  completePagePoster(rootElement, dom);

  completeDocumentBinding(rootElement, dom);
  addDocumentBookletSignaturePagesDef(rootElement, dom);
  addDocumentBindingGutterDef(rootElement, dom);
//  try {
//    if (scriptContext.DriverProperties.GetString("PDLMajorLevel").search("/vnd.hp-PCL6") == -1) {
//      paramValuesToPtpc(scriptContext, dom, printCapabilities.xmlNode, "JobInputBin");
//      paramValuesToPtpc(scriptContext, dom, printCapabilities.xmlNode, "PageMediaType");
//    }
//  }
//  catch(e) {
//    paramValuesToPtpc(scriptContext, dom, printCapabilities.xmlNode, "JobInputBin");
//    paramValuesToPtpc(scriptContext, dom, printCapabilities.xmlNode, "PageMediaType");
//  }

  completeDocumentCover(rootElement, dom, "DocumentCoverFront");
  completeDocumentCover(rootElement, dom, "DocumentCoverBack");
//  completeDocumentInterleaves(rootElement, dom);
  completeDocumentInsertPages(rootElement, dom);

  completePageWatermark(rootElement, dom);
  addPageWatermarkDefs(rootElement, dom);
  addDocumentHybridRasterInfoDefs(rootElement, dom);
  insertStrParameterDef(rootElement, dom, mtiNs, "JobStoragePIN", "PIN:", 4, 12, "", "characters", "psk:Conditional");
  insertStrParameterDef(rootElement, dom, mtiNs, "JobStoragePassword", "Password", 4, 128, "", "characters", "psk:Conditional");
  printCapabilities.XmlNode.documentElement.appendChild(dom.createComment("MTI completePrintCapabilities processed print caps"));

}

function convertPrintTicketToDevMode(printTicket, scriptContext, devModeProperties) {
  /// <param name="printTicket" type="IPrintSchemaTicket">
  ///     Print ticket to be converted to DevMode.
  /// </param>
  /// <param name="scriptContext" type="IPrinterScriptContext">
  ///     Script context object.
  /// </param>
  /// <param name="devModeProperties" type="IPrinterScriptablePropertyBag">
  ///     The DevMode property bag.
  /// </param>
  ///debugger;
  if (printTicket) {
    setSelectionNamespace(
    printTicket.XmlNode,
    psfPrefix,
    psfNs);
  }
  else return;

  var ticketPskPrefix = getPrefixForNamespace(printTicket.XmlNode, pskNs);
  ptToPageScaling(printTicket, devModeProperties);
  ptToDocumentBinding(printTicket, devModeProperties);
  ptToPagePoster(printTicket, devModeProperties);
  ptToDocumentCoverFront(printTicket, devModeProperties);
  ptToDocumentCoverBack(printTicket, devModeProperties);
//  ptToDocumentInterleaves(printTicket, devModeProperties);
  ptToDocumentInsertPages(printTicket, devModeProperties);
  ptToWatermark(printTicket, devModeProperties);
  ptToDuplex(printTicket, devModeProperties);
  ptToJobVars(printTicket, devModeProperties);

}

function convertDevModeToPrintTicket(devModeProperties, scriptContext, printTicket) {
  /// <param name="devModeProperties" type="IPrinterScriptablePropertyBag">
  ///     The DevMode property bag.
  /// </param>
  /// <param name="scriptContext" type="IPrinterScriptContext">
  ///     Script context object.
  /// </param>
  /// <param name="printTicket" type="IPrintSchemaTicket">
  ///     Print ticket to be converted from the DevMode.
  /// </param>
  ///debugger;
  if (!devModeProperties) {
    return;
  }

  if (printTicket) {
    setSelectionNamespace(
    printTicket.XmlNode,
    psfPrefix,
    psfNs);
  }
  else return;

  pageScalingToPt(printTicket, devModeProperties);
  duplexToPt(printTicket, scriptContext, devModeProperties);
  documentBindingToPt(printTicket, devModeProperties);
  pagePosterToPt(printTicket, devModeProperties);
  nupBordersToPt(printTicket, devModeProperties);
  presentationDirectionToPt(printTicket, devModeProperties);

 // try {
 //   if (scriptContext.DriverProperties.GetString("PDLMajorLevel").search("/vnd.hp-PCL6") == -1) {
 //     paramValuesToPtpc(scriptContext, printTicket.XmlNode, printTicket.xmlNode, "JobInputBin");
 //     paramValuesToPtpc(scriptContext, printTicket.XmlNode, printTicket.xmlNode, "PageMediaType");
 //   }
 // }
 // catch (e) {
 //   paramValuesToPtpc(scriptContext, printTicket.XmlNode, printTicket.xmlNode, "JobInputBin");
 //   paramValuesToPtpc(scriptContext, printTicket.XmlNode, printTicket.xmlNode, "PageMediaType");
 // }

  documentCoverFrontToPt(scriptContext, printTicket, devModeProperties);
  documentCoverBackToPt(scriptContext, printTicket, devModeProperties);
//  documentInterleavesToPt(scriptContext, printTicket, devModeProperties);
  documentInsertPagesToPt(scriptContext, printTicket, devModeProperties);
  watermarkToPt(printTicket, devModeProperties);
  ocmdataToPt(printTicket, scriptContext);
  jobVarsToPt(printTicket, scriptContext, devModeProperties);
  documentHybridRasterInfoToPt(printTicket, scriptContext);
  jobDeviceToPt(printTicket, scriptContext);
}

/**************************************************************
*                                                             *
*              Utility functions                              *
*                                                             *
**************************************************************/
function MakeDOM(progID) {
  if (progID == null) {
    progID = "msxml2.DOMDocument.6.0";
  }

  var dom;
  try {
    dom = new ActiveXObject(progID);
    dom.async = false;
    dom.validateOnParse = false;
    dom.resolveExternals = false;
  }
  catch (e) {
    alert(e.description);
  }
  return dom;
}

function LoadDOM(file) {
  var dom;
  try {
    dom = MakeDOM(null);
    dom.load(file);
  }
  catch (e) {
    alert(e.description);
  }
  return dom;
}

function insertNode(parent, dom, key, ns, name) {
  //    var nodNew = dom.createNode(1, nodeKey, psfNs); //dom.createElement(nodeKey);
  //    var nodName = dom.createAttribute("name");
  //    nodName.value = strName;
  var node = insertElement(parent, dom, key, ns, name, null);
  return node;
}

function insertFeature(parent, dom, keywordNamespace, paramName) {
  var childNode = getFeature(parent, keywordNamespace, paramName);
  if (childNode) parent.removeChild(childNode);
  var qName = getQName(paramName, keywordNamespace);
  return insertElement(parent, dom, "Feature", psfNs, qName, null);
}

function insertParameterDef(rootElement, dom, keywordNamespace, paramName) {
  var childNode = getParameterDef(rootElement, keywordNamespace, paramName);
  if (childNode) rootElement.removeChild(childNode);
  var qName = getQName(paramName, keywordNamespace);
  return insertElement(rootElement, dom, "ParameterDef", psfNs, qName, null);

}

/*
function insertParameterRef(parent, dom, keywordNamespace, paramName) {
    var childNode = getParameterRef(parent, keywordNamespace, paramName);
    if (childNode) parent.removeChild(childNode);
    var qName = getQName(paramName, keywordNamespace);
    return insertElement(parent, dom, "ParameterRef", psfNs, qName, null);

}
*/

function insertOption(parent, dom, keywordNamespace, paramName, paramConstrained) {
  var childNode = getOption(parent, keywordNamespace, paramName);
  if (childNode) parent.removeChild(childNode);
  var qName = null;
  var qName2 = null;
  if (paramName != null) qName = getQName(paramName, keywordNamespace);
  if (paramConstrained != null) qName2 = getQName(paramConstrained, pskNs);

  return insertElement(parent, dom, "Option", psfNs, qName, qName2);
}


function getFeature(node, keywordNamespace, featureName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>
  return getNode(node, "Feature", keywordNamespace, featureName);
}

function getParameterDef(node, keywordNamespace, paramName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>

  return getNode(node, "ParameterDef", keywordNamespace, paramName);

}

function getParameterInit(node, keywordNamespace, paramName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>

  return getNode(node, "ParameterInit", keywordNamespace, paramName);

}

function getParameterRef(node, keywordNamespace, paramName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>

  return getNode(node, "ParameterRef", keywordNamespace, paramName);

}

function getParameterRefName(node, keywordNamespace, paramName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>

  return getNode(node, "ParameterRef", keywordNamespace, paramName);

}
function getOption(node, keywordNamespace, paramName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>

  return getNode(node, "Option", keywordNamespace, paramName);

}

function getProperty(node, keywordNamespace, propertyName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>
  return getNode(node, "Property", keywordNamespace, propertyName);
}

function getValueNode(node) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="featureName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>
  var valueNode = node.selectSingleNode(getQName("Value", psfNs));
  return valueNode;
}


function getNode(node, tagName, keywordNamespace, name) {
  return searchByAttributeName(node, psfPrefix + ':' + tagName,
      keywordNamespace, name);

}
function setPropertyValue(propertyNode, value) {
  /// <summary>
  ///     Set the value contained in the 'Value' node under a 'Property'
  ///     or a 'ScoredProperty' node in the print ticket/print capabilities document.
  /// </summary>
  /// <param name="propertyNode" type="IXMLDOMNode">
  ///     The 'Property'/'ScoredProperty' node.
  /// </param>
  /// <param name="value" type="variant">
  ///     The value to be stored under the 'Value' node.
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true" locid="R:propertyValue">
  ///     First child 'Property' node if found, Null otherwise.
  /// </returns>
  var valueNode = getPropertyFirstValueNode(propertyNode);
  if (valueNode) {
    var child = valueNode.firstChild;
    if (child) {
      child.nodeValue = value;
      return child;
    }
  }
  return null;
}


function setSubPropertyValue(parentProperty, keywordNamespace, subPropertyName, value) {
  /// <summary>
  ///     Set the value contained in an inner Property node's 'Value' node (i.e. 'Value' node in a Property node
  ///     contained inside another Property node).
  /// </summary>
  /// <param name="parentProperty" type="IXMLDOMNode">
  ///     The parent property node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the property name is defined.
  /// </param>
  /// <param name="subPropertyName" type="String">
  ///     The name of the sub-property node.
  /// </param>
  /// <param name="value" type="variant">
  ///     The value to be set in the sub-property node's 'Value' node.
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     Refer setPropertyValue.
  /// </returns>
  if (!parentProperty ||
      !keywordNamespace ||
      !subPropertyName) {
    return null;
  }
  var subPropertyNode = getProperty(
                          parentProperty,
                          keywordNamespace,
                          subPropertyName);
  return setPropertyValue(
          subPropertyNode,
          value);
}

function getScoredProperty(node, keywordNamespace, scoredPropertyName) {
  /// <summary>
  ///     Retrieve a 'ScoredProperty' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="scoredPropertyName" type="String">
  ///     The ScoredProperty's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>

  // Note: It is possible to hard-code the 'psfPrefix' variable in the tag name since the
  // SelectionNamespace property has been set against 'psfPrefix'
  // in validatePrintTicket/completePrintCapabilities.
  return searchByAttributeName(
              node,
              psfPrefix + ":ScoredProperty",
              keywordNamespace,
              scoredPropertyName);
}

function getProperty(node, keywordNamespace, propertyName) {
  /// <summary>
  ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     The scope of the search i.e. the parent node.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's 'name' attribute is defined.
  /// </param>
  /// <param name="propertyName" type="String">
  ///     The Property's 'name' attribute (without the namespace prefix).
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The node on success, 'null' on failure.
  /// </returns>
  return searchByAttributeName(
          node,
          psfPrefix + ":Property",
          keywordNamespace,
          propertyName);
}

function setSelectedOptionName(printSchemaFeature, keywordPrefix, optionName) {
  /// <summary>
  ///      Set the 'name' attribute of a Feature's selected option
  ///      Note: This function should be invoked with Feature type that is retrieved
  ///            via either PrintCapabilties->GetFeature() or PrintTicket->GetFeature().
  ///
  ///      Caution: Setting only the 'name' attribute can result in an invalid option element.
  ///            Some options require their entire subtree to be updated.
  /// </summary>
  /// <param name="printSchemaFeature" type="IPrintSchemaFeature">
  ///     Feature variable.
  /// </param>
  /// <param name="keywordPrefix" type="String">
  ///     The prefix for the optionName parameter.
  /// </param>
  /// <param name="optionName" type="String">
  ///     The name (without prefix) to set as the 'name' attribute.
  /// </param>
  if (!printSchemaFeature ||
      !printSchemaFeature.SelectedOption ||
      !printSchemaFeature.SelectedOption.XmlNode) {
    return;
  }
  printSchemaFeature.SelectedOption.XmlNode.setAttribute(
      "name",
      keywordPrefix + ":" + optionName);
}


/**************************************************************
*                                                             *
*              Functions used by utility functions            *
*                                                             *
**************************************************************/

function getPropertyFirstValueNode(propertyNode) {
  /// <summary>
  ///     Retrieve the first 'value' node found under a 'Property' or 'ScoredProperty' node.
  /// </summary>
  /// <param name="propertyNode" type="IXMLDOMNode">
  ///     The 'Property'/'ScoredProperty' node.
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     The 'Value' node on success, 'null' on failure.
  /// </returns>
  if (!propertyNode) {
    return null;
  }

  var nodeName = propertyNode.nodeName;
  if ((nodeName.indexOf(":Property") < 0) &&
      (nodeName.indexOf(":ScoredProperty") < 0)) {
    return null;
  }

  var valueNode = propertyNode.selectSingleNode(psfPrefix + ":Value");
  return valueNode;
}

function searchByAttributeName(node, tagName, keywordNamespace, nameAttribute) {
  /// <summary>
  ///      Search for a node that with a specific tag name and containing a
  ///      specific 'name' attribute
  ///      e.g. &lt;Bar name=\"ns:Foo\"&gt; is a valid result for the following search:
  ///           Retrieve elements with tagName='Bar' whose nameAttribute='Foo' in
  ///           the namespace corresponding to prefix 'ns'.
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     Scope of the search i.e. the parent node.
  /// </param>
  /// <param name="tagName" type="String">
  ///     Restrict the searches to elements with this tag name.
  /// </param>
  /// <param name="keywordNamespace" type="String">
  ///     The namespace in which the element's name is defined.
  /// </param>
  /// <param name="nameAttribute" type="String">
  ///     The 'name' attribute to search for.
  /// </param>
  /// <returns type="IXMLDOMNode" mayBeNull="true">
  ///     IXMLDOMNode on success, 'null' on failure.
  /// </returns>
  if (!node ||
      !tagName ||
      !keywordNamespace ||
      !nameAttribute) {
    return null;
  }

  // For more information on this XPath query, visit:
  // http://blogs.msdn.com/b/benkuhn/archive/2006/05/04/printticket-names-and-xpath.aspx
  var xPathQuery = "descendant::"
                  + tagName
                  + "[substring-after(@name,':')='"
                  + nameAttribute
                  + "']"
                  + "[name(namespace::*[.='"
                   + keywordNamespace
                   + "'])=substring-before(@name,':')]"
  ;

  return node.selectSingleNode(xPathQuery);
}

function setSelectionNamespace(xmlNode, prefix, namespace) {
  /// <summary>
  ///     This function sets the 'SelectionNamespaces' property on the XML Node.
  ///     For more details: http://msdn.microsoft.com/en-us/library/ms756048(VS.85).aspx
  /// </summary>
  /// <param name="xmlNode" type="IXMLDOMNode">
  ///     The node on which the property is set.
  /// </param>
  /// <param name="prefix" type="String">
  ///     The prefix to be associated with the namespace.
  /// </param>
  /// <param name="namespace" type="String">
  ///     The namespace to be added to SelectionNamespaces.
  /// </param>
  xmlNode.setProperty(
      "SelectionNamespaces",
      "xmlns:"
          + prefix
          + "='"
          + namespace
          + "'"
      );
}


function getPrefixForNamespace(node, namespace) {
  /// <summary>
  ///     This function returns the prefix for a given namespace.
  ///     Example: In 'psf:printTicket', 'psf' is the prefix for the namespace.
  ///     xmlns:psf="http://schemas.microsoft.com/windows/2003/08/printing/printschemaframework"
  /// </summary>
  /// <param name="node" type="IXMLDOMNode">
  ///     A node in the XML document.
  /// </param>
  /// <param name="namespace" type="String">
  ///     The namespace for which prefix is returned.
  /// </param>
  /// <returns type="String">
  ///     Returns the namespace corresponding to the prefix.
  /// </returns>

  if (!node) {
    return null;
  }

  // navigate to the root element of the document.
  var rootNode = node.documentElement;

  // Query to retrieve the list of attribute nodes for the current node
  // that matches the namespace in the 'namespace' variable.
  var xPathQuery = "namespace::node()[.='"
              + namespace
              + "']";
  var namespaceNode = rootNode.selectSingleNode(xPathQuery);
  var prefix = namespaceNode.baseName;

  return prefix;
}
/*
function getParaInit(node, keywordNamespace, propertyName) {
    /// <summary>
    ///     Retrieve a 'Property' element in a print ticket/print capabilities document.
    /// </summary>
    /// <param name="node" type="IXMLDOMNode">
    ///     The scope of the search i.e. the parent node.
    /// </param>
    /// <param name="keywordNamespace" type="String">
    ///     The namespace in which the element's 'name' attribute is defined.
    /// </param>
    /// <param name="propertyName" type="String">
    ///     The Property's 'name' attribute (without the namespace prefix).
    /// </param>
    /// <returns type="IXMLDOMNode" mayBeNull="true">
    ///     The node on success, 'null' on failure.
    /// </returns>
    return searchByAttributeName(
            node,
            psfPrefix + ":ParameterInit",
            keywordNamespace,
            propertyName);
}
*/
// mti subroutines
function getQName(keyword, ns) {
  if (ns == pskNs) {
    if (keyword.substring(0, 4) != pskPrefix + ':')
      return pskPrefix + ':' + keyword;
    else return keyword;
  }

  if (ns == psfNs) {
    if (keyword.substring(0, 4) != psfPrefix + ':')
      return psfPrefix + ':' + keyword;
    else return keyword;
  }

  if (ns == xsiNs) {
    if (keyword.substring(0, 4) != xsiPrefix + ':')
      return xsiPrefix + ':' + keyword;
    else return keyword;
  }

  if (ns == xsdNs) {
    if (keyword.substring(0, 4) != xsdPrefix + ':')
      return xsdPrefix + ':' + keyword;
    else return keyword;
  }

  if (ns == mtiNs) {
    if (keyword.substring(0, 7) != mtiPrefix + ':')
      return mtiPrefix + ':' + keyword;
    else return keyword;
  }
  return keyword;
}

/*
   <parent ns:name="value"/>
*/
function insertAttribute(parent, dom, name, ns, value) {
  var qName = getQName(name, ns);
  var newNode = dom.createNode(2, qName, ns);
  newNode.value = value;
  parent.setAttributeNode(newNode);
  return newNode;
}
/*
  <ns:name name="value"/>
*/
function insertElement(parent, dom, name, ns, value, constrained) {
  var qName = getQName(name, ns);
  var newNode = dom.createNode(1, qName, ns);

  if (value != null)  // name="..."
    insertAttribute(newNode, dom, "name", "", value);

  if (constrained != null)  // constrained="..."
    insertAttribute(newNode, dom, "constrained", "", constrained);

  parent.appendChild(newNode);
  return newNode;
}


/*
  <psf:Property name="ns:name">
     <psf:Value xsi:type="xsd:string">value</psf:Value>
   </psf:Property>
*/
function insertStringProperty(parent, dom, name, ns, value) {
  var qName = getQName(name, ns);
  var nod2 = insertElement(parent, dom, "Property", psfNs, qName, null);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:string");
  valNode.text = value;
  nod2.appendChild(valNode);
  return nod2;
}

/*
  <psf:ScoredProperty name="ns:name">
    <psf:Value xsi:type="xsd:integer">value</psf:Value>
  </psf:Property>
*/

function insertIntScoredProperty(parent, dom, name, ns, value) {
  var qName = getQName(name, ns);
  var nod2 = insertElement(parent, dom, "ScoredProperty", psfNs, qName);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:integer");
  valNode.text = value.toString();
  nod2.appendChild(valNode);
  return nod2;
}


function insertStringScoredProperty(parent, dom, name, ns, value) {
  var qName = getQName(name, ns);
  var nod2 = insertElement(parent, dom, "ScoredProperty", psfNs, qName, null);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:string");
  valNode.text = value;
  nod2.appendChild(valNode);
  return nod2;
}

function insertQNameScoredProperty(parent, dom, name, ns, value) {
    var qName = getQName(name, ns);
    var nod2 = insertElement(parent, dom, "ScoredProperty", psfNs, qName, null);
    var valNode = dom.createNode(1, "psf:Value", psfNs);
    insertAttribute(valNode, dom, "type", xsiNs, "xsd:QName");
    valNode.text = "psk:"+ value;
    nod2.appendChild(valNode);
    return nod2;
}
/*
  <psf:ScoredProperty name="ns:name">
    <psf:ParameterRef name="refname"/>
  </psf:ScoredProperty>
*/

function insertRefScoredProperty(parent, dom, name, ns, refname) {
  var spNode = insertElement(parent, dom, "ScoredProperty", psfNs, getQName(name, ns), null);
  if (spNode)
    insertElement(spNode, dom, "ParameterRef", psfNs, refname, null);
  return spNode;
}

/*
   <psf:Property name="ns:name">
     <psf:Value xsi:type="xsd:QName">value</psf:Value>
   </psf:Property>
*/
function insertQNameProperty(parent, dom, name, ns, value) {
  var qName = getQName(name, ns);
  var nod2 = insertElement(parent, dom, "Property", psfNs, qName, null);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:QName");
  valNode.text = value;
  nod2.appendChild(valNode);
  return nod2;
}

/*
  <psf:Property name="ns:name">
    <psf:Value xsi:type="xsd:integer">value</psf:Value>
  </psf:Property>
*/
function insertIntProperty(parent, dom, name, ns, value) {
  var qName = getQName(name, ns);
  var nod2 = insertElement(parent, dom, "Property", psfNs, qName, null);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:integer");
  valNode.text = value.toString();
  nod2.appendChild(valNode);
  return nod2;
}

/*
  <psf:Property name="ns:name"/>
*/
function insertProperty(parent, dom, name, ns) {
  var qName = getQName(name, ns);

  var nod2 = getProperty(parent, ns, name);
  if (nod2 == null)
    nod2 = insertElement(parent, dom, "Property", psfNs, qName, null);
  return nod2;
}

function completePageScaling(rootElement, dom) {
  var featureNode = getFeature(rootElement, pskNs, "PageScaling");
  if (featureNode) {
    var optionNode = getOption(featureNode, pskNs, "CustomSquare");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "Scale", pskNs, pskPrefix + ":PageScalingScale");
    }
    var featureNode2 =
    cloneFeature(rootElement, featureNode, mtiNs, "JobScaleOffsetAlignment", pskPrefix + ":ScaleOffsetAlignment");

    if (featureNode2 != null) {    // change options from mtiNS into pskNs
      var optionNode2 = getOption(featureNode2, mtiNs, "Center");
      if (optionNode2 != null) {
        optionNode2.setAttribute("name", getQName("Center", pskNs));
      }

      optionNode2 = getOption(featureNode2, mtiNs, "TopLeft");
      if (optionNode2 != null) {
        optionNode2.setAttribute("name", getQName("TopLeft", pskNs));
      }
    }

    featureNode2 = cloneMediaSize(rootElement, dom, featureNode);
    if (featureNode2 != null)
      featureNode2.setAttribute("name", getQName("TargetMediaSize", mtiNs));

  }

}

function CompleteDuplex(rootElement, dom, scriptContext)
{
    var featureNode = getFeature(rootElement, pskNs, "JobDuplexAllDocumentsContiguously");
    var DuplexerInstalled = "";

    try {
        DuplexerInstalled = scriptContext.QueueProperties.GetString("Config:DuplexUnit");
    }

    catch (e) {
        DuplexerInstalled = "Installed";
    }

    var duplexOption = getOption(featureNode, pskNs, "TwoSidedLongEdge");

    if (DuplexerInstalled != "Installed") 
        insertQNameScoredProperty(duplexOption, dom, "DuplexMode", pskNs, "Manual");
    else 
        insertQNameScoredProperty(duplexOption, dom, "DuplexMode", pskNs, "Automatic");

    duplexOption = getOption(featureNode, pskNs, "TwoSidedShortEdge");


    if (DuplexerInstalled != "Installed") 
        insertQNameScoredProperty(duplexOption, dom, "DuplexMode", pskNs, "Manual");
    else
        insertQNameScoredProperty(duplexOption, dom, "DuplexMode", pskNs, "Automatic");
}

function insertIntParameterDef(rootElement, dom, namespace, name, displayName, maxValue, minValue, defaultValue, multiple, unitType, mandatory) {
  var defNode = insertParameterDef(rootElement, dom, namespace, name);
  if (displayName != null) insertStringProperty(defNode, dom, "DisplayName", pskNs, displayName);
  insertQNameProperty(defNode, dom, "DataType", psfNs, "xsd:integer");
  insertIntProperty(defNode, dom, "MaxValue", psfNs, maxValue);
  insertIntProperty(defNode, dom, "MinValue", psfNs, minValue);
  insertIntProperty(defNode, dom, "DefaultValue", psfNs, defaultValue);
  insertIntProperty(defNode, dom, "Multiple", psfNs, multiple);
  insertStringProperty(defNode, dom, "UnitType", psfNs, unitType);
  insertQNameProperty(defNode, dom, "Mandatory", psfNs, mandatory);
}

function insertStrParameterDef(rootElement, dom, namespace, name, displayName, minLength, maxLength, defaultValue, unitType, mandatory) {
  var defNode = insertParameterDef(rootElement, dom, namespace, name);
  if (displayName != null) insertStringProperty(defNode, dom, "DisplayName", pskNs, displayName);
  insertQNameProperty(defNode, dom, "DataType", psfNs, "xsd:string");
  insertStringProperty(defNode, dom, "DefaultValue", psfNs, defaultValue);
  insertIntProperty(defNode, dom, "MinLength", psfNs, minLength);
  insertIntProperty(defNode, dom, "MaxLength", psfNs, maxLength);
  insertStringProperty(defNode, dom, "UnitType", psfNs, unitType);
  insertQNameProperty(defNode, dom, "Mandatory", psfNs, mandatory);
}

function addPageScalingScaleDef(rootElement, dom) {
  insertIntParameterDef(rootElement, dom, pskNs, "PageScalingScale", "Zoom", 400, 25, 100, 1, "percent", "psk:Conditional");
}

function addDocumentNUpPageBorderWidthDef(rootElement, dom) {
  // <psf:ParameterRef name="ns0000:DocumentNUpPageBorderWidth"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "DocumentNUpPageBorderWidth", "NUp Border Width", 25000, 0, 0, 1, "microns", "psk:Conditional");
}

function addDocumentNUpPageBorderDashLengthDef(rootElement, dom) {
  // <psf:ParameterRef name="ns0000:DocumentNUpPageBorderDashLength"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "DocumentNUpPageBorderDashLength", "NUp Border Dash Length", 25000, 0, 0, 1, "microns", "psk:Conditional");
}

function addDocumentNUpPageBorderLengthDef(rootElement, dom) {
  // <psf:ParameterRef name="ns0000:DocumentNUpPageBorderDashLength"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "DocumentNUpPageBorderLength", "NUp Border Length", 25000, 0, 0, 1, "microns", "psk:Conditional");
}

function addPageWatermarkDefs(rootElement, dom) {
  // <psf:ParameterRef name="ns0000:PageWatermarkName"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, mtiNs, "PageWatermarkNameH", "Watermark Name", 0, 256, "", "characters", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextTextH"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextTextH", "Watermark Text", 1, 256, "Confidential", "characters", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextFontH"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextFontH", "Watermark Font", 1, 128, "Times New Roman", "characters", "psk:Conditional");

  // <psf:ParameterRef name="psk:PageWatermarkTransparency"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, pskNs, "PageWatermarkTransparency", "Transparency", 100, 0, 50, 1, "percent", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkPlacementOffsetWidth"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkPlacementOffsetWidth", "Horizontal", 500000, -500000, 0, 1, "microns", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkPlacementOffsetHeight"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkPlacementOffsetHeight", "Vertical", 500000, -500000, 0, 1, "microns", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextText"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, pskNs, "PageWatermarkTextText", "Watermark Text", 1, 63, "Confidential", "characters", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextFont"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextFont", "Font", 1, 31, "Times New Roman", "characters", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextOutline"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextOutline", "Outline Only", 1, 0, 0, 1, "boolean", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextBold"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextBold", "Bold", 1, 0, 0, 1, "boolean", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextItalic"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextItalic", "Italic", 1, 0, 0, 1, "boolean", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextFontSize"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, pskNs, "PageWatermarkTextFontSize", "Size", 1000, 4, 72, 1, "points", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextAngle"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, pskNs, "PageWatermarkTextAngle", "Angle", 359, 0, 45, 1, "degrees", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextAngle"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, pskNs, "PageWatermarkTextColor", "FontColor", 9, 9, "#FFFF0000", "sRGB", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkTextRightToLeft"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkTextRightToLeft", "Angle", 1, 0, 0, 1, "boolean", "psk:Conditional");

  // <psf:ParameterRef name="psk:PageWatermarkImageFileH"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, mtiNs, "PageWatermarkImageFileH", "ImageFileNameH", 0, 1048, "", "characters", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkImageFile"> ....</psf:ParameterRef>
  insertStrParameterDef(rootElement, dom, mtiNs, "PageWatermarkImageFile", "ImageFileName", 1, 260, "", "characters", "psk:Conditional");

  // <psf:ParameterRef name="psk:PageWatermarkImageScaleWidth"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkImageScaleWidth", "Scale Width", 10000, 1, 100, 1, "percent", "psk:Conditional");
  // <psf:ParameterRef name="psk:PageWatermarkImageScaleHeight"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "PageWatermarkImageScaleHeight", "Scale Height", 10000, 1, 100, 1, "percent", "psk:Conditional");
}

function addDocumentHybridRasterInfoDefs(rootElement, dom)
{
    insertIntParameterDef(rootElement, dom, mtiNs, "DocumentBandAlignmentHorizontal", "BandAlignmentHorizontal", 1024, 1, 256, 1, "pixels", "psk:Conditional");
    insertIntParameterDef(rootElement, dom, mtiNs, "DocumentBandAlignmentVertical", "BandAlignmentVertical", 1024, 1, 64, 1, "pixels", "psk:Conditional");
    insertIntParameterDef(rootElement, dom, mtiNs, "DocumentHPReverseScanLinesForDuplex", "HPReverseScanLinesForDuplex", 1, 0, 0, 1, "boolean", "psk:Conditional");
    insertIntParameterDef(rootElement, dom, mtiNs, "DocumentJetReadyVersion", "JetReadyVersion", 1024000, 1, 262144, 1, "version", "psk:Conditional");
    insertIntParameterDef(rootElement, dom, mtiNs, "DocumentTagPlaneVersion", "TagPlaneVersion", 4, 1, 1, 1, "planes", "psk:Conditional");
    insertStrParameterDef(rootElement, dom, mtiNs, "DocumentRasterModeDocNames", "RasterModeDocNames", 1, 260, "Microsoft Powerpoint \\- .*;.*\\.pdf", "characters", "psk:Conditional");
}

function insertIntParameterInit(rootElement, dom, keywordNamespace, paramName, value) {
  var childNode = getParameterInit(rootElement, keywordNamespace, paramName);
  if (childNode) rootElement.removeChild(childNode);
  var qName = getQName(paramName, keywordNamespace);
  var paramNode = insertElement(rootElement, dom, "ParameterInit", psfNs, qName, null);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:integer");
  valNode.text = value.toString();
  paramNode.appendChild(valNode);
}

function insertStringParameterInit(rootElement, dom, keywordNamespace, paramName, value) {
  var childNode = getParameterInit(rootElement, keywordNamespace, paramName);
  if (childNode) rootElement.removeChild(childNode);
  var qName = getQName(paramName, keywordNamespace);
  var paramNode = insertElement(rootElement, dom, "ParameterInit", psfNs, qName, null);
  var valNode = dom.createNode(1, "psf:Value", psfNs);
  insertAttribute(valNode, dom, "type", xsiNs, "xsd:string");
  valNode.text = value;
  paramNode.appendChild(valNode);
}


function ptToPageScaling(printTicket, devModeProperties) {
  var pageScalingFeatureXmlNode = getFeature(printTicket.xmlNode, pskNs, "PageScaling");
  var done = false;
  var zooming = false;
  var TargetMediaSize = "";
  if (pageScalingFeatureXmlNode) {

    var pageScalingOption = getOption(pageScalingFeatureXmlNode, pskNs, "None");
    if (pageScalingOption) {
      return;
    }
    else {
      pageScalingOption = getOption(pageScalingFeatureXmlNode, pskNs, "CustomSquare");
      if (pageScalingOption) {
        zooming = true;
      }
      else {
        pageScalingOption = getOption(pageScalingFeatureXmlNode, mtiNs, "FitApplicationImageableSizeToPageImageableSize");
        if (pageScalingOption) {
        }
      }
    }
    if (pageScalingOption) {
      var featureNode = getFeature(pageScalingFeatureXmlNode, mtiNs, "TargetMediaSize");
      if (featureNode) {
        var optionNode = featureNode.getElementsByTagName(getQName("Option", psfNs))[0];
        TargetMediaSize = optionNode.getAttribute("name");
        var propertyNode = getScoredProperty(optionNode, mtiNs, "MediaSizeWidth");
        if (propertyNode)
          devModeProperties.SetInt32("TargetMediaSizeWidth", parseInt(propertyNode.text, 10));
        else
          devModeProperties.SetInt32("TargetMediaSizeWidth", 0);
        propertyNode = getScoredProperty(optionNode, mtiNs, "MediaSizeHeight");
        if (propertyNode)
          devModeProperties.SetInt32("TargetMediaSizeHeight", parseInt(propertyNode.text, 10));
        else
          devModeProperties.SetInt32("TargetMediaSizeHeight", 0);
      }
    }
  }

  devModeProperties.SetString("TargetMediaSize", TargetMediaSize);

  if (zooming) {
    var pageScalingCustomSquareXmlNode = getOption(pageScalingFeatureXmlNode, pskNs, "CustomSquare");
    if (pageScalingCustomSquareXmlNode) {
      var nod2 = getScoredProperty(pageScalingCustomSquareXmlNode, pskNs, "Scale");
      //needs to find the ParameterRef name here. Use "PageScalingScale" for now
      if (nod2) {
        if (getParameterRef(nod2, pskNs, "PageScalingScale")) { // psf:ParameterRef exists?
          var PageScalingScaleNode = getParameterInit(printTicket.XmlNode, pskNs, "PageScalingScale");
          if (PageScalingScaleNode) {
            devModeProperties.SetInt32("Zoom", parseInt(PageScalingScaleNode.text));
          }
        }
      }

    }
  }
}

function ptToDocumentBinding(printTicket, devModeProperties) {
  var defNode = getParameterInit(printTicket.XmlNode, pskNs, "DocumentBindingGutter");
  if (defNode) {
    devModeProperties.SetInt32("BindingGutter", parseInt(defNode.text));
  }

  defNode = getParameterInit(printTicket.XmlNode, mtiNs, "DocumentBookletSignaturePages");
  if (defNode) {
    devModeProperties.SetInt32("SignaturePages", parseInt(defNode.text));
  }
}

function ptToDuplex(printTicket, devModeProperties) {
    var duplexNode = getFeature(printTicket.xmlNode, pskNs, "JobDuplexAllDocumentsContiguously");
    var done = false;
    var DuplexerInstalled = "";

    if (duplexNode) {
        var duplexOption = (duplexNode.getElementsByTagName(getQName("Option", psfNs))[0]);
        if (duplexOption) {
            var optionName = duplexOption.getAttribute("name");
            if (optionName == "psk:OneSided")
                return;
            var propertyNode = getScoredProperty(duplexOption, pskNs, "DuplexMode");
            if (propertyNode) {
                //QName
                var newStr = propertyNode.text.substr(propertyNode.text.indexOf(':') + 1);
                if((newStr == "Manual") || (newStr == "Automatic"))
                  devModeProperties.SetString("DuplexMode", newStr);
            }
//            else
//                devModeProperties.SetString("DuplexMode", "Manual");
        }
    }
}

function ptToPagePoster(printTicket, devModeProperties) {
  var pagePosterNode = getFeature(printTicket.xmlNode, pskNs, "PagePoster");
  var done = false;
  if (pagePosterNode) {
    var pagePosterOption = (pagePosterNode.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name");
    if (pagePosterOption) {
      if (pagePosterOption == mtiPrefix + ":_1") {
        devModeProperties.SetInt32("Poster", 1);
      }
      if (pagePosterOption == mtiPrefix + ":_2") {
        devModeProperties.SetInt32("Poster", 2);
      }
      if (pagePosterOption == mtiPrefix + ":_3") {
        devModeProperties.SetInt32("Poster", 3);
      }
      if (pagePosterOption == mtiPrefix + ":_4") {
        devModeProperties.SetInt32("Poster", 4);
      }
      if (pagePosterOption == mtiPrefix + ":_5") {
        devModeProperties.SetInt32("Poster", 5);
      }
      return;
    }
    else {  // no "name" attribute, use the scored property field
      pagePosterOption = pagePosterNode.getElementsByTagName(getQName("Option", psfNs))[0];
      var scoredProperty = getScoredProperty(pagePosterOption, pskNs, "SheetsPerPage");
      if ((scoredProperty == null) || (scoredProperty.firstChild.tagName != "psf:Value")) return;
      var poster = parseInt(scoredProperty.firstChild.text);
      switch (poster) {
        case 1:
          devModeProperties.SetInt32("Poster", 1);
          break;
        case 4:
          devModeProperties.SetInt32("Poster", 2);
          break;
        case 9:
          devModeProperties.SetInt32("Poster", 3);
          break;
        case 16:
          devModeProperties.SetInt32("Poster", 4);
          break;
        case 25:
          devModeProperties.SetInt32("Poster", 5);
          break;
      }

    }

  }
}

function pagePosterToPt(printTicket, devModeProperties) {
  var pagePosterNode = getFeature(printTicket.xmlNode, pskNs, "PagePoster");
  var poster = devModeProperties.getInt32("Poster");
  if (pagePosterNode) {
    var pagePosterOption = pagePosterNode.getElementsByTagName(getQName("Option", psfNs))[0];
    if (pagePosterOption) {
      insertIntScoredProperty(pagePosterOption, printTicket.XmlNode, "SheetsPerPage", pskNs, poster * poster);
      pagePosterOption.removeAttribute("name");
    }
    //        insertIntScoredProperty(printTicket.XmlNode,
  }
}

function pageScalingToPt(printTicket, devModeProperties) {

  var ticketPskPrefix = getPrefixForNamespace(printTicket.XmlNode, pskNs);
  var pageScalingFeatureXmlNode = printTicket.GetFeature("PageScaling");
  var iZoom = devModeProperties.GetInt32("Zoom");
  var TargetMediaSize = devModeProperties.GetString("TargetMediaSize");
  var dom = printTicket.XmlNode;
  var rootElement = printTicket.XmlNode.documentElement;
  var TargetMediaSizeWidth = 0, TargetMediaSizeHeight = 0;
  var optionNode = null;

  if (pageScalingFeatureXmlNode) {
    optionNode = pageScalingFeatureXmlNode.XmlNode.getElementsByTagName(getQName("Option", psfNs))[0];

    var optionName = optionNode.getAttribute("name");

    if (optionName == getQName("None", pskNs))
      return;

    if (optionName == getQName("FitApplicationImageableSizeToPageImageableSize", mtiNs))
    {
      // set TargetMediaSize & OffsetAlignment later
    }

    if (optionName == getQName("CustomSquare", pskNs)) {
      insertRefScoredProperty(optionNode, dom, "Scale", pskNs, "psk:PageScalingScale");
      insertIntParameterInit(rootElement, dom, pskNs, "PageScalingScale", iZoom);
    }

    if (TargetMediaSize != "") {
      TargetMediaSizeWidth = devModeProperties.GetInt32("TargetMediaSizeWidth");
      TargetMediaSizeHeight = devModeProperties.GetInt32("TargetMediaSizeHeight");
      var featureNode = insertFeature(pageScalingFeatureXmlNode.XmlNode, dom, mtiNs, "TargetMediaSize");
      optoinNode = insertElement(featureNode, dom, "Option", psfNs, TargetMediaSize);
      insertIntScoredProperty(optoinNode, dom, "MediaSizeWidth", mtiNs, TargetMediaSizeWidth);
      insertIntScoredProperty(optoinNode, dom, "MediaSizeHeight", mtiNs, TargetMediaSizeHeight);
    }

    var featureNode2 =
    cloneFeature(rootElement, pageScalingFeatureXmlNode.XmlNode, mtiNs, "JobScaleOffsetAlignment", "psk:ScaleOffsetAlignment");
    if (featureNode2 != null) {    // change options from mtiNS into pskNs
      var optionNode2 =
        getOption(featureNode2, mtiNs, "Center");
      if (optionNode2 != null) {
        optionNode2.setAttribute("name", getQName("Center", pskNs));
      }

      optionNode2 =
        getOption(featureNode2, mtiNs, "TopLeft");
      if (optionNode2 != null) {
        optionNode2.setAttribute("name", getQName("TopLeft", pskNs));
      }
    }

  }

}

function duplexToPt(printTicket, scriptContext, devModeProperties) {
    ///debugger;
    var rootElement = printTicket.XmlNode.documentElement;
    var dom = printTicket.XmlNode;
    var otherFeature;
    var optionNode;
    var optonName;
    var manualDuplexFeature;
    var duplexFeature = getFeature(rootElement, pskNs, "JobDuplexAllDocumentsContiguously");
    var duplexOptionNode = duplexFeature.getElementsByTagName(getQName("Option", psfNs))[0];
    var duplexOptionName = duplexOptionNode.getAttribute("name");
      // added for manual duplex manual feed case
      var inputBinFeature;
      var optionInputBin;

    var DuplexerInstalled = "";
    var cannotDuplex = new Boolean();


    if (duplexOptionName == "psk:OneSided")
        return;

    cannotDuplex = false;

    try {
        DuplexerInstalled = scriptContext.QueueProperties.GetString("Config:DuplexUnit");
    }

    catch (e) {
        DuplexerInstalled = "Installed";
    }

//    if (getFeature(rootElement, mtiNs, "JobManualDuplex") == null)
//    {
//        if (DuplexerInstalled != "Installed") {
//            duplexFeature.removeChild(duplexOptionNode);
//            insertOption(duplexFeature, dom, pskNs, "OneSided", null);
//        }
//        else {
//            insertQNameScoredProperty(duplexOptionNode, dom, "DuplexMode", pskNs, "Automatic");
//        }
//        return;
//    }

    otherFeature = getFeature(rootElement, pskNs, "PageMediaSize");
    optionNode = otherFeature.getElementsByTagName(getQName("Option", psfNs))[0];
    optionName = optionNode.getAttribute("name");

    key = optionName.substring(optionName.indexOf(":") + 1);
    noDuplexPaperSize = "";
    noDuplexPaperType = "";
    try { noDuplexPaperSize = scriptContext.DriverProperties.GetString("NoDuplexSize"); }
    catch (e) { noDuplexPaperSize = ""; }

    if (noDuplexPaperSize != "") {
        if (noDuplexPaperSize.indexOf(key) != -1) cannotDuplex = true;
//        if (key.indexOf("Userform") != -1) cannotDuplex = true;
    }

    try { noDuplexPaperType = scriptContext.DriverProperties.GetString("NoDuplexType"); }
    catch (e) { noDuplexPaperSize = ""; }

    otherFeature = getFeature(rootElement, pskNs, "PageMediaType");
    optionNode = otherFeature.getElementsByTagName(getQName("Option", psfNs))[0];
    optionName = optionNode.getAttribute("name");

    key = optionName.substring(optionName.indexOf(":") + 1);
    if (noDuplexPaperType != "") {
        if (noDuplexPaperType.indexOf(key) != -1) cannotDuplex = true;
    }

    if (DuplexerInstalled != "Installed" || cannotDuplex)
        insertQNameScoredProperty(duplexOptionNode, dom, "DuplexMode", pskNs, "Manual");
    else
        insertQNameScoredProperty(duplexOptionNode, dom, "DuplexMode", pskNs, "Automatic");

    manualDuplexFeature = getFeature(rootElement, mtiNs, "JobManualDuplex");
    if (manualDuplexFeature != null) {
        optionNode = manualDuplexFeature.getElementsByTagName(getQName("Option", psfNs))[0];
        if (optionNode)
            manualDuplexFeature.removeChild(optionNode);
        //        var duplexMode = devModeProperties.GetString("DuplexMode");
        //        if (devModeProperties.GetString("DuplexMode") == "Manual") {
        if (DuplexerInstalled != "Installed" || cannotDuplex) {
              if (duplexOptionName == "psk:TwoSidedLongEdge") {
                insertOption(manualDuplexFeature, dom, mtiNs, "ManualLongEdge", null);
                  // added for Manual Duplex Manual Feed case
                  inputBinFeature = getFeature(rootElement, pskNs, "JobInputBin");
                  if (inputBinFeature) {
                      optionInputBin = inputBinFeature.getElementsByTagName(getQName("Option", psfNs))[0];
                      if (optionInputBin && (optionInputBin.getAttribute("name") == "psk:Manual")) {
                          inputBinFeature.removeChild(optionInputBin);
                          insertOption(inputBinFeature, dom, mtiNs, "Tray1", null);
                      }
                  }
              }
              else if (duplexOptionName == "psk:TwoSidedShortEdge") {
                insertOption(manualDuplexFeature, dom, mtiNs, "ManualShortEdge", null);
                  // added for Manual Duplex Manual Feed case
                  inputBinFeature = getFeature(rootElement, pskNs, "JobInputBin");
                  if (inputBinFeature) {
                      optionInputBin = inputBinFeature.getElementsByTagName(getQName("Option", psfNs))[0];
                      if (optionInputBin && (optionInputBin.getAttribute("name") == "psk:Manual")) {
                          inputBinFeature.removeChild(optionInputBin);
                          insertOption(inputBinFeature, dom, mtiNs, "Tray1", null);
                      }
                  }
              }
            else
                insertOption(manualDuplexFeature, dom, mtiNs, "ManualSimplex", null);
        }
        else
            insertOption(manualDuplexFeature, dom, mtiNs, "ManualSimplex", null);
    }
}

function documentBindingToPt(printTicket, devModeProperties) {
  var rootElement = printTicket.XmlNode.documentElement;
  var dom = printTicket.XmlNode;

  var documentBindingFeature = getFeature(rootElement, pskNs, "DocumentBinding");
  var iBindingGutter = devModeProperties.GetInt32("BindingGutter");
  var iSignaturePages = devModeProperties.GetInt32("SignaturePages");

  if (documentBindingFeature) {
    var optionNode = documentBindingFeature.getElementsByTagName(getQName("Option", psfNs))[0];
    var optionName = optionNode.getAttribute("name");
    switch (optionName) {
      case "psk:None":
        break;
      case "psk:Booklet":
        insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
        insertIntParameterInit(rootElement, dom, pskNs, "DocumentBindingGutter", iBindingGutter);

        insertRefScoredProperty(optionNode, dom, "SignaturePages", mtiNs, mtiPrefix + ":DocumentBookletSignaturePages");
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentBookletSignaturePages", iSignaturePages);
        break;
      case "ns0000:JapaneseBooklet":
        insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
        insertIntParameterInit(rootElement, dom, pskNs, "DocumentBindingGutter", iBindingGutter);

        insertRefScoredProperty(optionNode, dom, "SignaturePages", mtiNs, mtiPrefix + ":DocumentBookletSignaturePages");
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentBookletSignaturePages", iSignaturePages);
        break;
      case "psk:BindLeft":
        insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
        insertIntParameterInit(rootElement, dom, pskNs, "DocumentBindingGutter", iBindingGutter);
        break;
      case "psk:BindTop":
        insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
        insertIntParameterInit(rootElement, dom, pskNs, "DocumentBindingGutter", iBindingGutter);
        break;
      case "psk:BindRight":
        insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
        insertIntParameterInit(rootElement, dom, pskNs, "DocumentBindingGutter", iBindingGutter);
        break;
      case "psk:BindBottom":
        insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
        insertIntParameterInit(rootElement, dom, pskNs, "DocumentBindingGutter", iBindingGutter);
        break;
    }

  }

}

function ptToWatermark(printTicket, devModeProperties) {

  // watermark name and other common params
  var paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkNameH");
  if (paramNode) {
    devModeProperties.SetString("PageWatermarkNameH", paramNode.firstChild.text);
  }
  else
    devModeProperties.SetString("PageWatermarkNameH", "");

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkPlacementOffsetWidth");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkPlacementOffsetWidth", parseInt(paramNode.firstChild.text, 10));
  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkPlacementOffsetHeight");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkPlacementOffsetHeight", parseInt(paramNode.firstChild.text, 10));

  // text watermark
  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkTextTextH");
  if (paramNode)
    devModeProperties.SetString("PageWatermarkTextTextH", paramNode.firstChild.text);

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkTextFontH");
  if (paramNode)
    devModeProperties.SetString("PageWatermarkTextFontH", paramNode.firstChild.text);

  paramNode = getParameterInit(printTicket.XmlNode, pskNs, "PageWatermarkTextColor");
  if (paramNode)
    devModeProperties.SetString("PageWatermarkTextColor", paramNode.firstChild.text.substr(1));

  paramNode = getParameterInit(printTicket.XmlNode, pskNs, "PageWatermarkTextAngle");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkTextAngle", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, pskNs, "PageWatermarkTransparency");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkTransparency", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, pskNs, "PageWatermarkTextFontSize");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkTextFontSize", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkTextBold");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkTextBold", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkTextItalic");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkTextItalic", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkTextOutline");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkTextOutline", parseInt(paramNode.firstChild.text, 10));

  // common to text and image watermark    
  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkPlacementOffsetWidth");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkPlacementOffsetWidth", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkPlacementOffsetHeight");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkPlacementOffsetHeight", parseInt(paramNode.firstChild.text, 10));

  // image watermark
  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkImageFileH");
  if (paramNode)
    devModeProperties.SetString("PageWatermarkImageFileH", paramNode.firstChild.text);

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkImageScaleWidth");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkImageScaleWidth", parseInt(paramNode.firstChild.text, 10));

  paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "PageWatermarkImageScaleHeight");
  if (paramNode)
    devModeProperties.SetInt32("PageWatermarkImageScaleHeight", parseInt(paramNode.firstChild.text, 10));
}

function watermarkToPt(printTicket, devModeProperties) {
  var rootElement = printTicket.XmlNode.documentElement;
  var dom = printTicket.XmlNode;
  var ticketPskPrefix = getPrefixForNamespace(printTicket.XmlNode, pskNs);
  var watermarkFeature;

  // complete placement offset stuffs first
  placementNode = getFeature(rootElement, mtiNs, "PageWatermarkPlacement");
  if (placementNode) {
    optionNode = placementNode.getElementsByTagName(getQName("Option", psfNs))[0];
    insertRefScoredProperty(optionNode, dom, "OffsetWidth", mtiNs, mtiPrefix + ":PageWatermarkPlacementOffsetWidth");
    insertRefScoredProperty(optionNode, dom, "OffsetHeight", mtiNs, mtiPrefix + ":PageWatermarkPlacementOffsetHeight");
    // always write  PlacementOffsetWidth, PlacementOffsetHeight
    insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkPlacementOffsetWidth", devModeProperties.GetInt32("PageWatermarkPlacementOffsetWidth"));
    insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkPlacementOffsetHeight", devModeProperties.GetInt32("PageWatermarkPlacementOffsetHeight"));
  }

  if (devModeProperties.GetString("PageWatermarkNameH").length == 0) {
    watermarkFeature = getFeature(rootElement, pskNs, "PageWatermark");
      //if (watermarkFeature) rootElement.removeChild(watermarkFeature);
        if (watermarkFeature) {
            rootElement.removeChild(watermarkFeature);
            //CR-54968 - Add mti:Exclude to PT if none is selected
            watermarkFeature = insertFeature(rootElement, dom, pskNs, "PageWatermark");
            if (watermarkFeature != null) {
                insertOption(watermarkFeature, dom, mtiNs, "Exclude", null);
            }
        }

  }
  else {

    // then check watermark type
    watermarkFeature = getFeature(rootElement, pskNs, "PageWatermark");

    if (watermarkFeature) {
      var optionNode = watermarkFeature.getElementsByTagName(getQName("Option", psfNs))[0];
      var optionName = optionNode.getAttribute("name");

      insertStringParameterInit(rootElement, dom, mtiNs, "PageWatermarkNameH", devModeProperties.GetString("PageWatermarkNameH"));

      if (optionName == pskPrefix + ":Text") {
        // watermark attributes
        insertRefScoredProperty(optionNode, dom, "Text", pskNs, "psk:PageWatermarkTextText");
        insertRefScoredProperty(optionNode, dom, "Font", mtiNs, mtiPrefix + ":PageWatermarkTextFont");

        insertRefScoredProperty(optionNode, dom, "Outline", mtiNs, mtiPrefix + ":PageWatermarkTextOutline");
        insertRefScoredProperty(optionNode, dom, "Bold", mtiNs, mtiPrefix + ":PageWatermarkTextBold");
        insertRefScoredProperty(optionNode, dom, "Italic", mtiNs, mtiPrefix + ":PageWatermarkTextItalic");

        insertRefScoredProperty(optionNode, dom, "FontSize", pskNs, "psk:PageWatermarkTextFontSize");
        insertRefScoredProperty(optionNode, dom, "Angle", pskNs, "psk:PageWatermarkTextAngle");
        insertRefScoredProperty(optionNode, dom, "FontColor", pskNs, "psk:PageWatermarkTextColor");
        insertRefScoredProperty(optionNode, dom, "Transparency", pskNs, "psk:PageWatermarkTransparency");
        insertRefScoredProperty(optionNode, dom, "RightToLeft", mtiNs, mtiPrefix + ":PageWatermarkTextRightToLeft");

        // clone 3 sub-features from root features
        cloneFeature(rootElement, watermarkFeature, mtiNs, "PageWatermarkPlacement", mtiPrefix + ":Placement");
        var featureNode2 =
        cloneFeature(rootElement, watermarkFeature, mtiNs, "PageWatermarkLayering", "psk:Layering");

        if (featureNode2 != null) {    // change options from mtiNS into pskNs
          var optionNode2 = getOption(featureNode2, mtiNs, "Overlay");
          if (optionNode2 != null) {
            optionNode2.setAttribute("name", getQName("Overlay", pskNs));
          }

          optionNode2 = getOption(featureNode2, mtiNs, "Underlay");
          if (optionNode2 != null) {
            optionNode2.setAttribute("name", getQName("Underlay", pskNs));
          }
        }



        cloneFeature(rootElement, watermarkFeature, mtiNs, "PageWatermarkUsage", mtiPrefix + ":Usage");

        // paramInit
        insertStringParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextTextH", devModeProperties.GetString("PageWatermarkTextTextH"));
        insertStringParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextFontH", devModeProperties.GetString("PageWatermarkTextFontH"));

        insertStringParameterInit(rootElement, dom, pskNs, "PageWatermarkTextText", Hex2String(devModeProperties.GetString("PageWatermarkTextTextH")));
        insertStringParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextFont", Hex2String(devModeProperties.GetString("PageWatermarkTextFontH")));

        insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextOutline", devModeProperties.GetInt32("PageWatermarkTextOutline"));
        insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextBold", devModeProperties.GetInt32("PageWatermarkTextBold"));
        insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextItalic", devModeProperties.GetInt32("PageWatermarkTextItalic"));

        insertIntParameterInit(rootElement, dom, pskNs, "PageWatermarkTextFontSize", devModeProperties.GetInt32("PageWatermarkTextFontSize"));
        insertIntParameterInit(rootElement, dom, pskNs, "PageWatermarkTextAngle", devModeProperties.GetInt32("PageWatermarkTextAngle"));
        insertStringParameterInit(rootElement, dom, pskNs, "PageWatermarkTextColor", "#" + devModeProperties.GetString("PageWatermarkTextColor"));
        insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkTextRightToLeft", devModeProperties.GetInt32("PageWatermarkTextRightToLeft"));
      }

      if (optionName == mtiPrefix + ":Image") {
        // image watermark attributes
        insertRefScoredProperty(optionNode, dom, "File", mtiNs, mtiPrefix + ":PageWatermarkImageFile");
        insertRefScoredProperty(optionNode, dom, "ScaleWidth", mtiNs, mtiPrefix + ":PageWatermarkImageScaleWidth");
        insertRefScoredProperty(optionNode, dom, "ScaleHeight", mtiNs, mtiPrefix + ":PageWatermarkImageScaleHeight");
        insertRefScoredProperty(optionNode, dom, "Transparency", mtiNs, "psk:PageWatermarkTransparency");

        // 3 sub-features
        cloneFeature(rootElement, watermarkFeature, mtiNs, "PageWatermarkPlacement", mtiPrefix + ":Placement");

        var featureNode2 =
        cloneFeature(rootElement, watermarkFeature, mtiNs, "PageWatermarkLayering", "psk:Layering");
        if (featureNode2 != null) {    // change options from mtiNS into pskNs
          var optionNode2 = getOption(featureNode2, mtiNs, "Overlay");
          if (optionNode2 != null) {
            optionNode2.setAttribute("name", getQName("Overlay", pskNs));
          }

          optionNode2 = getOption(featureNode2, mtiNs, "Underlay");
          if (optionNode2 != null) {
            optionNode2.setAttribute("name", getQName("Underlay", pskNs));
          }
        }
        cloneFeature(rootElement, watermarkFeature, mtiNs, "PageWatermarkUsage", mtiPrefix + ":Usage");

        // paramInit
        insertStringParameterInit(rootElement, dom, mtiNs, "PageWatermarkImageFileH", devModeProperties.GetString("PageWatermarkImageFileH"));
        insertStringParameterInit(rootElement, dom, mtiNs, "PageWatermarkImageFile", Hex2String(devModeProperties.GetString("PageWatermarkImageFileH")));

        insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkImageScaleWidth", devModeProperties.GetInt32("PageWatermarkImageScaleWidth"));
        insertIntParameterInit(rootElement, dom, mtiNs, "PageWatermarkImageScaleHeight", devModeProperties.GetInt32("PageWatermarkImageScaleHeight"));
      }

      insertIntParameterInit(rootElement, dom, pskNs, "PageWatermarkTransparency", devModeProperties.GetInt32("PageWatermarkTransparency"));
    }
  }

}

function ocmdataToPt(printTicket, scriptContext) {
  var rootElement = printTicket.XmlNode.documentElement;
  var dom = printTicket.XmlNode;
  var ticketPskPrefix = getPrefixForNamespace(printTicket.XmlNode, pskNs);
  var ocmdataItems, featureName, ocmdataItems;
  var ocmFeature;
  var ocmdata, optionName;
  var ocmCount = 0;
  var strPJL = "";

  var propertyNode = getProperty(rootElement, mtiNs, "DocumentStartOCMData");
  if (propertyNode != null) {
    rootElement.removeChild(propertyNode);
  }

  propertyNode = getProperty(rootElement, mtiNs, "PageOCMData");
  if (propertyNode != null) {
    rootElement.removeChild(propertyNode);
  }

  propertyNode = getProperty(rootElement, mtiNs, "DocumentEndOCMData");
  if (propertyNode != null) {
    rootElement.removeChild(propertyNode);
  }

  // no driver property bag? return immediately
  if (scriptContext.DriverProperties == null) return;

  // no ocmdata ? return
  try {
    ocmdata = scriptContext.DriverProperties.GetBool("ocmdata");
  } catch (e) {
    return;
  }

  if (ocmdata == false) return;

  // insert 'modelName=' since OCM search for that key to judge whether it's string ocm

  featureName = "modelName";
  try {
    ocmdata = scriptContext.DriverProperties.GetString("ocmdata." + featureName);
  } catch (e) {
    ocmdata = "modelName=undefined";
  }

  featureNode = getFeature(rootElement, pskNs, "PageResolution");
  xResolution = null;
  yResolution = null;
  if (featureNode) {
    xResolution = getNode(featureNode, "ScoredProperty", pskNs, "ResolutionX");
    yResolution = getNode(featureNode, "ScoredProperty", pskNs, "ResolutionY");
  }

  ocmCount++;
  propertyNode = insertProperty(rootElement, dom, "DocumentStartOCMData", mtiNs);
  insertStringProperty(propertyNode, dom, "DataType", mtiNs, "String");
  insertStringProperty(propertyNode, dom, "OCMData1", mtiNs, ocmdata);
  if (xResolution !=null ) {
    ocmCount++;
    insertStringProperty(propertyNode, dom, "OCMData2", mtiNs, "dpi.x="+xResolution.text);
  }
  if (yResolution != null) {
    ocmCount++;
    insertStringProperty(propertyNode, dom, "OCMData3", mtiNs, "dpi.y=" + yResolution.text);
  }

  propertyNode = insertProperty(rootElement, dom, "PageOCMData", mtiNs);
  insertStringProperty(propertyNode, dom, "DataType", mtiNs, "String");
  insertStringProperty(propertyNode, dom, "OCMData1", mtiNs, ocmdata);
  if (xResolution != null) {
    insertStringProperty(propertyNode, dom, "OCMData2", mtiNs, "dpi.x=" + xResolution.text);
  }
  if (yResolution != null) {
    insertStringProperty(propertyNode, dom, "OCMData3", mtiNs, "dpi.y=" + yResolution.text);
  }


  propertyNode = insertProperty(rootElement, dom, "DocumentEndOCMData", mtiNs);
  insertStringProperty(propertyNode, dom, "DataType", mtiNs, "String");
  insertStringProperty(propertyNode, dom, "OCMData1", mtiNs, ocmdata);


  // process common items
  //iCommonItems = 0;
  //while (true) {
  //  featureName = "DocumentCommonOcm";
  //  try {
  //    ocmdata = scriptContext.DriverProperties.GetString("ocmdata." + featureName + "." + iCommonItems.toString());
  //  } catch (e) {
  //    ocmdata = "";
  //  }
  //  if (ocmdata.length > 0) {
  //    propertyNode = insertProperty(rootElement, dom, "DocumentStartOCMData", mtiNs);
  //    ocmCount++;
  //    insertStringProperty(propertyNode, dom, "OCMData" + ocmCount.toString(), mtiNs, ocmdata);
  //    iCommonItems++;
  //  }
  //  else break;
  //}

  var ocmString = collectOcmdata(rootElement, scriptContext);

  insertOcmDataByType(printTicket, scriptContext, "DocumentStartOCMData", ocmCount, ocmString);
  insertOcmDataByType(printTicket, scriptContext, "PageOCMData", ocmCount, ocmString);
  insertOcmDataByType(printTicket, scriptContext, "DocumentEndOCMData", 1, ocmString);
}

function collectOcmdata(rootElement, scriptContext) {
  var ocmstr = "";
  var driverProperties = scriptContext.DriverProperties;
  var i =0 ;
  var featureNode;
  var propertyName = "ocmdata";
  var ocmData;
  for (i = 0 ; i < rootElement.childNodes.length; i++) {
    if (rootElement.childNodes[i].baseName != "Feature") continue;
    featureNode = rootElement.childNodes[i];
    if ((featureNode.firstChild.attributes.length > 0) &&
      (featureNode.firstChild.attributes[0].baseName == "name")) {
      propertyName = "ocmdata." + featureNode.attributes[0].value.substr(featureNode.attributes[0].value.indexOf(":") + 1) + "." +
        featureNode.firstChild.attributes[0].value.substr(featureNode.firstChild.attributes[0].value.indexOf(":") + 1);
      try {
        ocmData = driverProperties.GetString(propertyName);
      }
      catch (e) {
        ocmData= "";
      }
      if (ocmData != "") {
        if(ocmstr != "") ocmstr = ocmstr + "\n" ;
        ocmstr= ocmstr+ocmData;
      }
    }
  }
  return ocmstr;
}


function insertOcmDataByType(printTicket, scriptContext, ocmDataType, ocmCount, ocmdata) {

  var rootElement = printTicket.XmlNode.documentElement;
  var dom = printTicket.XmlNode;
  var ocmDataItems, featureName, ocmDataItems, ocmFeature, optionName;
  var strPJL = "";

  //try {
  //  ocmdataItems = scriptContext.DriverProperties.GetString(ocmDataType);
  //} catch (e) {
  //  ocmdataItems = "";
  //}

//  while (ocmdataItems.length > 0)
  {
    //if (ocmdataItems.indexOf(",") != -1) {
    //  featureName = ocmdataItems.substring(0, ocmdataItems.indexOf(","));
    //  ocmdataItems = ocmdataItems.substring(ocmdataItems.indexOf(",") + 1);
    //}
    //else {
    //  featureName = ocmdataItems;
    //  ocmdataItems = "";
    //}
    //if (featureName.length == 0) continue;
    //ocmFeature = getFeature(rootElement, mtiNs, featureName);
    //if (ocmFeature == null)
    //  ocmFeature = getFeature(rootElement, pskNs, featureName);
    //if (ocmFeature == null) continue;

    //// insert ocmdata 
    //optionName = ocmFeature.firstChild.getAttribute("name");
    //if (optionName.indexOf(":") >= 0)
    //  optionName = optionName.substring(optionName.indexOf(":") + 1);
    //try {
    //  ocmdata = scriptContext.DriverProperties.GetString("ocmdata." + featureName + "." + optionName);
    //} catch (e) {
    //  ocmdata = "";
    //}
    if (ocmdata.length > 0) {
      if (ocmdata.indexOf("@PJL ") == 0) {
        if (strPJL.length == 0) strPJL = "pjl=" + ocmdata + "\r\n";
        else strPJL += ocmdata + "\r\n";
      }
      else {
        ocmCount++;
        propertyNode = insertProperty(rootElement, dom, ocmDataType, mtiNs);
        //if (ocmCount == 1)
        //  insertStringProperty(propertyNode, dom, "DataType", mtiNs, "String");

        while (ocmdata.indexOf("\n") >= 0) {
          insertStringProperty(propertyNode, dom, "OCMData" + ocmCount.toString(), mtiNs, ocmdata.substring(0, ocmdata.indexOf("\n")));
          ocmCount++;
          ocmdata = ocmdata.substring(ocmdata.indexOf("\n") + 1);
        }
        insertStringProperty(propertyNode, dom, "OCMData" + ocmCount.toString(), mtiNs, ocmdata);
      }
    }
  }

  if (strPJL.length > 0) {
    ocmCount++;
    propertyNode = insertProperty(rootElement, dom, ocmDataType, mtiNs);
    //if (ocmCount == 1)
    //  insertStringProperty(propertyNode, dom, "DataType", mtiNs, "String");
    insertStringProperty(propertyNode, dom, "OCMData" + ocmCount.toString(), mtiNs, strPJL);
  }

}

function completeDocumentNUp(rootElement, dom) {
  var documentNUpNode = getFeature(rootElement, pskNs, "DocumentNUp")
  if (documentNUpNode) {
    var featureNode =
      cloneFeature(rootElement, documentNUpNode, mtiNs, "JobPresentationDirection", "psk:PresentationDirection");

    if (featureNode != null) {
      var optionNode;

      optionNode = getOption(featureNode, mtiNs, "RightBottom");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("RightBottom", pskNs));
      }

      optionNode = getOption(featureNode, mtiNs, "BottomRight");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("BottomRight", pskNs));
      }
      optionNode = getOption(featureNode, mtiNs, "LeftBottom");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("LeftBottom", pskNs));
      }
      optionNode = getOption(featureNode, mtiNs, "BottomLeft");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("BottomLeft", pskNs));
      }
      optionNode = getOption(featureNode, mtiNs, "RightTop");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("RightTop", pskNs));
      }
      optionNode = getOption(featureNode, mtiNs, "TopRight");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("TopRight", pskNs));
      }
      optionNode = getOption(featureNode, mtiNs, "LeftTop");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("LeftTop", pskNs));
      }
      optionNode = getOption(featureNode, mtiNs, "TopLeft");
      if (optionNode != null) {
        optionNode.setAttribute("name", getQName("TopLeft", pskNs));
      }
    }
    completeDocumentNUpBorders(rootElement, documentNUpNode, dom);
  }
}


function completeDocumentNUpBorders(rootElement, documentNUpNode, dom) {
  // <psf:Feature name="mti:NUpBorders"> .... </psf:Feature>

  // cloneFeature() then fill ScoredProperties to sub-feature
  var nupBorderNode = cloneFeature(rootElement, documentNUpNode, mtiNs, "JobNUpBorders", mtiPrefix + ":" + "NUpBorders");
  //    var nupBorderNode = getFeature(rootElement, mtiNs, "JobNUpBorders");
  if (nupBorderNode == null) return;

  optionNode = getOption(nupBorderNode, mtiNs, "On");
  if (optionNode) {
    insertRefScoredProperty(optionNode, dom, "BorderWidth", mtiNs, mtiPrefix + ":DocumentNUpPageBorderWidth");
    //        insertRefScoredProperty(optionNode, dom, "BorderDashLength", mtiNs, mtiPrefix + ":DocumentNUpPageBorderDashLength");
  }

  optionNode = getOption(nupBorderNode, mtiNs, "Grid");  //constrained="psk:None"
  if (optionNode) {
    insertRefScoredProperty(optionNode, dom, "BorderWidth", mtiNs, mtiPrefix + ":DocumentNUpPageBorderWidth");
    insertRefScoredProperty(optionNode, dom, "BorderDashLength", mtiNs, mtiPrefix + ":DocumentNUpPageBorderDashLength");
  }
  optionNode = getOption(nupBorderNode, mtiNs, "Corner");  //constrained="psk:None"
  if (optionNode) {
    insertRefScoredProperty(optionNode, dom, "BorderWidth", mtiNs, mtiPrefix + ":DocumentNUpPageBorderWidth");
    insertRefScoredProperty(optionNode, dom, "BorderLength", mtiNs, mtiPrefix + ":DocumentNUpPageBorderLength");
  }


}

function completePagePoster(rootElement, dom) {
  var pagePosterNode = getFeature(rootElement, pskNs, "PagePoster");
  if (pagePosterNode) {
    var nextNode = pagePosterNode.firstChild;
    poster = 1;
    while (nextNode != null) {
      if (nextNode.baseName == "Option") {    // remove the name attribute according to Print Schema definition

        nextNode.removeAttribute("name");
        insertIntScoredProperty(nextNode, dom, "SheetsPerPage", pskNs, poster * poster);
        poster = poster + 1;
      }
      nextNode = nextNode.nextSibling;
    }

  }
}


function completeDocumentBinding(rootElement, dom) {
  var bindingNode = getFeature(rootElement, pskNs, "DocumentBinding");
  if (bindingNode) {

    optionNode = getOption(bindingNode, pskNs, "Booklet");
    if (optionNode) {

      insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
      insertRefScoredProperty(optionNode, dom, "SignaturePages", mtiNs, mtiPrefix + ":DocumentBookletSignaturePages");
    }

    optionNode = getOption(bindingNode, mtiNs, "JapaneseBooklet");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
      insertRefScoredProperty(optionNode, dom, "SignaturePages", mtiNs, mtiPrefix + ":DocumentBookletSignaturePages");
    }

    optionNode = getOption(bindingNode, pskNs, "BindLeft");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
    }

    optionNode = getOption(bindingNode, pskNs, "BindTop");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
    }

    optionNode = getOption(bindingNode, pskNs, "BindRight");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
    }

    optionNode = getOption(bindingNode, pskNs, "BindBottom");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "BindingGutter", pskNs, pskPrefix + ":DocumentBindingGutter");
    }
  }

}

function completePageWatermark(rootElement, dom) {

  placementNode = getFeature(rootElement, mtiNs, "PageWatermarkPlacement");
  if (placementNode) {
    nodes = placementNode.getElementsByTagName(getQName("Option", psfNs));

    for (i = 0; i < nodes.length; i++) {
      optionNode = nodes[i];
      if (optionNode.getAttribute("name") == mtiPrefix + ":ScaleToPage") continue;
      insertRefScoredProperty(optionNode, dom, "OffsetWidth", mtiNs, mtiPrefix + ":PageWatermarkPlacementOffsetWidth");
      insertRefScoredProperty(optionNode, dom, "OffsetHeight", mtiNs, mtiPrefix + ":PageWatermarkPlacementOffsetHeight");
    }
  }

  watermarkNode = getFeature(rootElement, pskNs, "PageWatermark");
  if (watermarkNode) {

    subFeature = cloneFeature(rootElement, watermarkNode, mtiNs, "PageWatermarkPlacement", mtiPrefix + ":Placement");
    var featureNode2 =
    cloneFeature(rootElement, watermarkNode, mtiNs, "PageWatermarkLayering", pskPrefix + ":Layering");

    if (featureNode2 != null) {    // change options from mtiNS into pskNs
      var optionNode2 = getOption(featureNode2, mtiNs, "Overlay");
      if (optionNode2 != null) {
        optionNode2.setAttribute("name", getQName("Overlay", pskNs));
      }

      optionNode2 = getOption(featureNode2, mtiNs, "Underlay");
      if (optionNode2 != null) {
        optionNode2.setAttribute("name", getQName("Underlay", pskNs));
      }
    }

    cloneFeature(rootElement, watermarkNode, mtiNs, "PageWatermarkUsage", mtiPrefix + ":Usage");

    optionNode = getOption(watermarkNode, pskNs, "Text");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "Text", pskNs, pskPrefix + ":PageWatermarkTextText");
      insertRefScoredProperty(optionNode, dom, "Font", mtiNs, mtiPrefix + ":PageWatermarkTextFont");
      insertRefScoredProperty(optionNode, dom, "Outline", mtiNs, mtiPrefix + ":PageWatermarkTextOutline");
      insertRefScoredProperty(optionNode, dom, "Bold", mtiNs, mtiPrefix + ":PageWatermarkTextBold");
      insertRefScoredProperty(optionNode, dom, "Italic", mtiNs, mtiPrefix + ":PageWatermarkTextItalic");
      insertRefScoredProperty(optionNode, dom, "FontSize", pskNs, pskPrefix + ":PageWatermarkTextFontSize");
      insertRefScoredProperty(optionNode, dom, "Angle", pskNs, pskPrefix + ":PageWatermarkTextAngle");
      insertRefScoredProperty(optionNode, dom, "FontColor", pskNs, pskPrefix + ":PageWatermarkTextColor");
      insertRefScoredProperty(optionNode, dom, "Transparency", pskNs, pskPrefix + ":PageWatermarkTransparency");
      insertRefScoredProperty(optionNode, dom, "RightToLeft", mtiNs, mtiPrefix + ":PageWatermarkTextRightToLeft");
    }

    optionNode = getOption(watermarkNode, mtiNs, "Image");
    if (optionNode) {
      insertRefScoredProperty(optionNode, dom, "File", mtiNs, mtiPrefix + ":PageWatermarkImageFile");
      insertRefScoredProperty(optionNode, dom, "ScaleWidth", mtiNs, mtiPrefix + ":PageWatermarkImageScaleWidth");
      insertRefScoredProperty(optionNode, dom, "ScaleHeight", mtiNs, mtiPrefix + ":PageWatermarkImageScaleHeight");
      insertRefScoredProperty(optionNode, dom, "Transparency", mtiNs, pskPrefix + ":PageWatermarkTransparency");
    }
  }

}

function addDocumentBookletSignaturePagesDef(rootElement, dom) {
  // <psf:ParameterRef name="mti:DocumentBookletSignaturePages"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, mtiNs, "DocumentBookletSignaturePages", "Signature Pages", 250000, 0, 0, 4, "pages", "psk:Conditional");
}

function addDocumentBindingGutterDef(rootElement, dom) {
  // <psf:ParameterRef name="psk:DocumentBindingGutter"> ....</psf:ParameterRef>
  insertIntParameterDef(rootElement, dom, pskNs, "DocumentBindingGutter", "Shift From Binding", 250000, 0, 0, 1, "microns", "psk:Conditional");
}

function completeDocumentCover(rootElement, dom, nodeName) {
  var coverNode = getFeature(rootElement, mtiNs, nodeName);
  if (coverNode == null) return null;
  cloneMediaSize(rootElement, dom, coverNode);
  cloneMediaType(rootElement, dom, coverNode);
  cloneInputBin(rootElement, dom, coverNode);
}

function completeDocumentInterleaves(rootElement, dom) {
  var iNode = getFeature(rootElement, mtiNs, "DocumentInterleaves");
  if (iNode == null) return null;
  cloneMediaSize(rootElement, dom, iNode);
  cloneMediaType(rootElement, dom, iNode);
  cloneInputBin(rootElement, dom, iNode);

}

function completeDocumentExceptionUsage(rootElement, parentExceptionNode, dom)
{
    var iNode = getFeature(rootElement, mtiNs, "DocumentExceptionUsage");
    if (iNode == null) return null;
    // cloneFeature() then fill ScoredProperties to sub-feature
    var exceptionNode = cloneFeature(rootElement, parentExceptionNode, mtiNs, "DocementExceptionUsage", mtiPrefix + ":" + "ExceptionUsage");

    if (exceptionNode == null) return;

    optionNode = getOption(exceptionNode, mtiNs, "SpecifiedPages");
    if (optionNode) {
        insertRefScoredProperty(optionNode, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExectionPages");
    }
    optionNode = getOption(exceptionNode, mtiNs, "NotSpecifiedPages");
    if (optionNode) {
        insertRefScoredProperty(optionNode, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExectionPages");
    }
}

function completeDocumentInsertPages(rootElement, dom)
{
//  var iNode = getFeature(rootElement, mtiNs, "DocumentInsertPages");
//  if (iNode == null) return null;
//  cloneMediaSize(rootElement, dom, iNode);
//  cloneMediaType(rootElement, dom, iNode);
//  cloneInputBin(rootElement, dom, iNode);
//  cloneExceptionUsage(rootElement, dom, iNode);

  var iNode = getFeature(rootElement, mtiNs, "DocumentBlankSheetException1");
  if (iNode == null) return null;
  cloneMediaSize(rootElement, dom, iNode);
  cloneMediaType(rootElement, dom, iNode);
  cloneInputBin(rootElement, dom, iNode);
  cloneExceptionUsage(rootElement, dom, iNode);
  
  var subFeature=getFeature(iNode, mtiNs, "ExceptionUsage");
  var ExceptionOption=getOption(subFeature, mtiNs, "SpecifiedPages");
  if(ExceptionOption)
      insertRefScoredProperty(ExceptionOption, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExceptionPages1");
  ExceptionOption=getOption(subFeature, mtiNs, "NotSpecifiedPages");
  if(ExceptionOption)
      insertRefScoredProperty(ExceptionOption, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExceptionPages1");

  iNode = getFeature(rootElement, mtiNs, "DocumentMediaException1");
  if (iNode == null) return null;
  cloneMediaSize(rootElement, dom, iNode);
  cloneMediaType(rootElement, dom, iNode);
  cloneInputBin(rootElement, dom, iNode);
  cloneExceptionUsage(rootElement, dom, iNode);
  subFeature = getFeature(iNode, mtiNs, "ExceptionUsage");
  ExceptionOption = getOption(subFeature, mtiNs, "SpecifiedPages");
  if (ExceptionOption)
      insertRefScoredProperty(ExceptionOption, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExceptionPages2");
  ExceptionOption = getOption(subFeature, mtiNs, "NotSpecifiedPages");
  if (ExceptionOption)
      insertRefScoredProperty(ExceptionOption, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExceptionPages2");

  insertStrParameterDef(rootElement, dom, mtiNs, "DocumentExceptionPages1", "Pages", 1, 128, "", "characters", "psk:Conditional");
  insertStrParameterDef(rootElement, dom, mtiNs, "DocumentExceptionPages2", "Pages", 1, 128, "", "characters", "psk:Conditional");
}


function cloneMediaSize(rootElement, dom, parentNode) {

  var node1 = insertFeature(parentNode, dom, mtiNs, "MediaSize");

  var MediaSizeNode = getFeature(rootElement, pskNs, "PageMediaSize");

  if (MediaSizeNode) {    // copy PageMediaSize to sub-feature, except psk:CustomMediaSize, but add mti:UsePageMediaSize
    var GUIStringsNode = getFeature(rootElement, mtiNs, "DocumentGUIStrings");
    var optionInserted = false;
    var nextNod = MediaSizeNode.firstChild;
    while (nextNod != null) {
      if (nextNod.baseName == "Option") {    // need to add checking, do not add if "psk:CustomMediaSize"
        if (!optionInserted) {
          var optionNode = insertOption(node1, dom, mtiNs, "UsePageMediaSize", null);
          if (GUIStringsNode != null) {
            var stringOptionNode = getOption(GUIStringsNode, mtiNs, "IDS_USE_PAPER_SIZE");
            insertStringProperty(optionNode, dom, "DisplayName", pskNs, stringOptionNode.text);
          }
          else
            insertStringProperty(optionNode, dom, "DisplayName", pskNs, "Use Paper Size Setting");
          optionInserted = true;
        }

        if (nextNod.attributes[0].nodeValue != "psk:CustomMediaSize") {
          var cloneNode = nextNod.cloneNode(true);
          var childnode = cloneNode.firstChild;
          while (childnode != null) {
            if (childnode.baseName == "ScoredProperty") {
              if (childnode.getAttribute("name") == "psk:MediaSizeWidth")
                childnode.setAttribute("name", mtiPrefix + ":" + "MediaSizeWidth");
              else if (childnode.getAttribute("name") == "psk:MediaSizeHeight")
                childnode.setAttribute("name", mtiPrefix + ":" + "MediaSizeHeight");
            }
            childnode = childnode.nextSibling;
          }
          node1.appendChild(cloneNode);
        }
      }
      else if (nextNod.baseName == "Property") {
        var cloneNodeProperty = nextNod.cloneNode(true);
        node1.appendChild(cloneNodeProperty);
      }
      nextNod = nextNod.nextSibling;
    }
    return node1;
  }
  else return null;

}

function cloneMediaType(rootElement, dom, parentNode) {

  cloneFeature(rootElement, parentNode, pskNs, "PageMediaType", mtiPrefix + ":" + "MediaType");
}

function cloneInputBin(rootElement, dom, parentNode) {
  cloneFeature(rootElement, parentNode, pskNs, "JobInputBin", mtiPrefix + ":" + "InputBin");
}

function cloneExceptionUsage(rootElement, dom, parentNode) {
    cloneFeature(rootElement, parentNode, mtiNs, "DocumentExceptionUsage", mtiPrefix + ":" + "ExceptionUsage");
}

function nupBordersToPt(printTicket, devModeProperties) {
  var rootElement = printTicket.XmlNode.documentElement;
  var documentNUpFeatureXmlNode = getFeature(rootElement, pskNs, "DocumentNUp");
  var dom = printTicket.XmlNode;
  if (documentNUpFeatureXmlNode == null) return;

  var scoredProperty = getScoredProperty(documentNUpFeatureXmlNode, pskNs, "PagesPerSheet");
  if ((scoredProperty == null) || (scoredProperty.firstChild.tagName != "psf:Value") || (scoredProperty.firstChild.text == "1")) return;
  completeDocumentNUpBorders(rootElement, documentNUpFeatureXmlNode, printTicket.XmlNode);
  insertIntParameterInit(rootElement, dom, mtiNs, "DocumentNUpPageBorderWidth", 0);
  //insertIntParameterInit(rootElement, dom, mtiNs, "DocumentNUpPageBorderDashLength", 0);
}

function presentationDirectionToPt(printTicket, devModeProperties) {
  var rootElement = printTicket.XmlNode.documentElement;
  var documentNUpFeatureXmlNode = getFeature(rootElement, pskNs, "DocumentNUp");
  if (documentNUpFeatureXmlNode == null) return;

  var scoredProperty = getScoredProperty(documentNUpFeatureXmlNode, pskNs, "PagesPerSheet");
  if ((scoredProperty == null) || (scoredProperty.firstChild.tagName != "psf:Value") || (scoredProperty.firstChild.text == "1")) return;
  var featureNode =
    cloneFeature(rootElement, documentNUpFeatureXmlNode, mtiNs, "JobPresentationDirection", "psk:PresentationDirection");
  if (featureNode != null) {
    var optionNode;
    optionNode = getOption(featureNode, mtiNs, "RightBottom");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("RightBottom", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "BottomRight");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("BottomRight", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "LeftBottom");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("LeftBottom", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "BottomLeft");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("BottomLeft", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "RightTop");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("RightTop", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "TopRight");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("TopRight", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "LeftTop");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("LeftTop", pskNs));
    }
    optionNode = getOption(featureNode, mtiNs, "TopLeft");
    if (optionNode != null) {
      optionNode.setAttribute("name", getQName("TopLeft", pskNs));
    }
  }

}


function cloneFeature(rootElement, dstNode, namespace, oldName, newName) {
  var mtiFeature = getFeature(rootElement, namespace, oldName);
  if (mtiFeature) {
    var cloneNode = mtiFeature.cloneNode(true);
    cloneNode.setAttribute("name", newName);
    dstNode.appendChild(cloneNode);
    return cloneNode;
  }
  else return null;
}

function ptToDocumentCoverFront(printTicket, devModeProperties) {   // save to devmode property bag
  var documentCoverFrontFeatureNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentCoverFront");
  if (documentCoverFrontFeatureNode) {
    var child = getFeature(documentCoverFrontFeatureNode, mtiNs, "MediaSize");
    if (child) {
      devModeProperties.SetString("FrontCoverMediaSize", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
      var scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeWidth");
      if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
        devModeProperties.SetInt32("FrontCoverMediaSizeWidth", parseInt(scoredProperty.firstChild.text, 10));

      scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeHeight");
      if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
        devModeProperties.SetInt32("FrontCoverMediaSizeHeight", parseInt(scoredProperty.firstChild.text, 10));
    }
    child = getFeature(documentCoverFrontFeatureNode, mtiNs, "MediaType");
    if (child) devModeProperties.SetString("FrontCoverMediaType", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
    child = getFeature(documentCoverFrontFeatureNode, mtiNs, "InputBin");
    if (child) devModeProperties.SetString("FrontCoverInputBin", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
  }
}

function ptToDocumentCoverBack(printTicket, devModeProperties) {
  var documentCoverBackFeatureNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentCoverBack");
  if (documentCoverBackFeatureNode) {
    var child = getFeature(documentCoverBackFeatureNode, mtiNs, "MediaSize");
    if (child) {
      devModeProperties.SetString("BackCoverMediaSize", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
      var scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeWidth");
      if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
        devModeProperties.SetInt32("BackCoverMediaSizeWidth", parseInt(scoredProperty.firstChild.text, 10));

      scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeHeight");
      if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
        devModeProperties.SetInt32("BackCoverMediaSizeHeight", parseInt(scoredProperty.firstChild.text, 10));
    }
    child = getFeature(documentCoverBackFeatureNode, mtiNs, "MediaType");
    if (child) devModeProperties.SetString("BackCoverMediaType", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
    child = getFeature(documentCoverBackFeatureNode, mtiNs, "InputBin");
    if (child) devModeProperties.SetString("BackCoverInputBin", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
  }
}

function ptToDocumentInterleaves(printTicket, devModeProperties) {
  var documentInterleavesFeatureNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentInterleaves");
  if (documentInterleavesFeatureNode) {
    var child = getFeature(documentInterleavesFeatureNode, mtiNs, "MediaSize");
    if (child) {
      devModeProperties.SetString("InterleavesMediaSize", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
      var scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeWidth");
      if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
        devModeProperties.SetInt32("InterleavesMediaSizeWidth", parseInt(scoredProperty.firstChild.text, 10));

      scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeHeight");
      if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
        devModeProperties.SetInt32("InterleavesMediaSizeHeight", parseInt(scoredProperty.firstChild.text, 10));
    }
    child = getFeature(documentInterleavesFeatureNode, mtiNs, "MediaType");
    if (child) devModeProperties.SetString("InterleavesMediaType", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
    child = getFeature(documentInterleavesFeatureNode, mtiNs, "InputBin");
    if (child) devModeProperties.SetString("InterleavesInputBin", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
  }
}

function ptToDocumentInsertPages(printTicket, devModeProperties) {
    // save to devmode property bag
    // empty Inserts
    var documentInsertPagesFeatureNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentBlankSheetException1");
    if (documentInsertPagesFeatureNode != null) {
        var child = getFeature(documentInsertPagesFeatureNode, mtiNs, "MediaSize");
        if (child) {
          devModeProperties.SetString("InsertEmptyPagesMediaSize", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
            var scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeWidth");
            if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
                devModeProperties.SetInt32("InsertEmptyPagesMediaSizeWidth", parseInt(scoredProperty.firstChild.text, 10));

            scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeHeight");
            if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
                devModeProperties.SetInt32("InsertEmptyPagesMediaSizeHeight", parseInt(scoredProperty.firstChild.text, 10));
        }
        child = getFeature(documentInsertPagesFeatureNode, mtiNs, "MediaType");
        if (child) devModeProperties.SetString("InsertEmptyPagesMediaType", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
        child = getFeature(documentInsertPagesFeatureNode, mtiNs, "InputBin");
        if (child) devModeProperties.SetString("InsertEmptyPagesInputBin", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
        child = getFeature(documentInsertPagesFeatureNode, mtiNs, "ExceptionUsage");
        if (child) devModeProperties.SetString("InsertEmptyPagesExceptionUsage", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));

        var paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "DocumentExceptionPages1");
        if (paramNode)
            devModeProperties.SetString("InsertEmptyPagesList", paramNode.firstChild.text);
        else
            devModeProperties.SetString("InsertEmptyPagesList", "");
    }

    // Print Inserts
    documentInsertPagesFeatureNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentMediaException1");
    if (documentInsertPagesFeatureNode !=null) {
        var child = getFeature(documentInsertPagesFeatureNode, mtiNs, "MediaSize");
        if (child) {
            devModeProperties.SetString("InsertPrintPagesMediaSize", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
            var scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeWidth");
            if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
                devModeProperties.SetInt32("InsertPrintPagesMediaSizeWidth", parseInt(scoredProperty.firstChild.text, 10));

            scoredProperty = getScoredProperty(child, mtiNs, "MediaSizeHeight");
            if ((scoredProperty != null) && (scoredProperty.firstChild.tagName == "psf:Value"))
                devModeProperties.SetInt32("InsertPrintPagesMediaSizeHeight", parseInt(scoredProperty.firstChild.text, 10));
        }
        child = getFeature(documentInsertPagesFeatureNode, mtiNs, "MediaType");
        if (child) devModeProperties.SetString("InsertPrintPagesMediaType", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
        child = getFeature(documentInsertPagesFeatureNode, mtiNs, "InputBin");
        if (child) devModeProperties.SetString("InsertPrintPagesInputBin", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));
        child = getFeature(documentInsertPagesFeatureNode, mtiNs, "ExceptionUsage");
        if (child) devModeProperties.SetString("InsertPrintPagesExceptionUsage", (child.getElementsByTagName(getQName("Option", psfNs))[0]).getAttribute("name"));

        var paramNode = getParameterInit(printTicket.XmlNode, mtiNs, "DocumentExceptionPages2");
        if (paramNode)
            devModeProperties.SetString("InsertPrintPagesList", paramNode.firstChild.text);
        else
            devModeProperties.SetString("InsertPrintPagesList", "");
    }
}


function documentCoverFrontToPt(scriptContext, printTicket, devModeProperties) {
  var frontCoverMediaSize = devModeProperties.GetString("FrontCoverMediaSize");
  var frontCoverMediaType = devModeProperties.GetString("FrontCoverMediaType");
  var frontCoverInputBin = devModeProperties.GetString("FrontCoverInputBin");
  var mediaSizeWidth = devModeProperties.GetInt32("FrontCoverMediaSizeWidth");
  var mediaSizeHeight = devModeProperties.GetInt32("FrontCoverMediaSizeHeight");

  var dom = printTicket.XmlNode;
  var frontCoverNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentCoverFront");
  if (frontCoverNode) {
    var optionNode = getOption(frontCoverNode, mtiNs, "NoCover");
    if (optionNode) return;
    var subfeature = insertFeature(frontCoverNode, dom, mtiNs, "MediaSize");
    var sizeOption = insertElement(subfeature, dom, "Option", psfNs, frontCoverMediaSize);

    if (frontCoverMediaSize != mtiPrefix + ":UsePageMediaSize")    // must specify property scores for width height
    {
      insertIntScoredProperty(sizeOption, dom, "MediaSizeWidth", mtiNs, mediaSizeWidth);
      insertIntScoredProperty(sizeOption, dom, "MediaSizeHeight", mtiNs, mediaSizeHeight);
    }

    subfeature = insertFeature(frontCoverNode, dom, mtiNs, "MediaType");
    insertElement(subfeature, dom, "Option", psfNs, frontCoverMediaType);
//    paramValuesToPtpc(scriptContext, dom, frontCoverNode, "MediaType");

    subfeature = insertFeature(frontCoverNode, dom, mtiNs, "InputBin");
    insertElement(subfeature, dom, "Option", psfNs, frontCoverInputBin);
 //   paramValuesToPtpc(scriptContext, dom, frontCoverNode, "InputBin");
  }
}

function documentCoverBackToPt(scriptContext, printTicket, devModeProperties) {
  var backCoverMediaSize = devModeProperties.GetString("BackCoverMediaSize");
  var backCoverMediaType = devModeProperties.GetString("BackCoverMediaType");
  var backCoverInputBin = devModeProperties.GetString("BackCoverInputBin");
  var mediaSizeWidth = devModeProperties.GetInt32("BackCoverMediaSizeWidth");
  var mediaSizeHeight = devModeProperties.GetInt32("BackCoverMediaSizeHeight");

  var dom = printTicket.XmlNode;
  var backCoverNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentCoverBack");
  if (backCoverNode) {
    var optionNode = getOption(backCoverNode, mtiNs, "NoCover");
    if (optionNode) return;
    var subfeature = insertFeature(backCoverNode, dom, mtiNs, "MediaSize");
    var sizeOption = insertElement(subfeature, dom, "Option", psfNs, backCoverMediaSize);

    if (backCoverMediaSize != mtiPrefix + ":UsePageMediaSize")    // must specify property scores for width height
    {
      insertIntScoredProperty(sizeOption, dom, "MediaSizeWidth", mtiNs, mediaSizeWidth);
      insertIntScoredProperty(sizeOption, dom, "MediaSizeHeight", mtiNs, mediaSizeHeight);
    }

    subfeature = insertFeature(backCoverNode, dom, mtiNs, "MediaType");
    insertElement(subfeature, dom, "Option", psfNs, backCoverMediaType);
//    paramValuesToPtpc(scriptContext, dom, backCoverNode, "MediaType");

    subfeature = insertFeature(backCoverNode, dom, mtiNs, "InputBin");
    insertElement(subfeature, dom, "Option", psfNs, backCoverInputBin);
//    paramValuesToPtpc(scriptContext, dom, backCoverNode, "InputBin");
  }
}

function documentInterleavesToPt(scriptContext, printTicket, devModeProperties) {
  var interleavesMediaSize = devModeProperties.GetString("InterleavesMediaSize");
  var interleavesMediaType = devModeProperties.GetString("InterleavesMediaType");
  var interleavesInputBin = devModeProperties.GetString("InterleavesInputBin");
  var mediaSizeWidth = devModeProperties.GetInt32("InterleavesMediaSizeWidth");
  var mediaSizeHeight = devModeProperties.GetInt32("InterleavesMediaSizeHeight");

  var dom = printTicket.XmlNode;
  var interleavesNode = getFeature(printTicket.xmlNode, mtiNs, "DocumentInterleaves");
  if (interleavesNode) {
    var optionNode = getOption(interleavesNode, mtiNs, "NoInterleaves");
    if (optionNode) return;
    var subfeature = insertFeature(interleavesNode, dom, mtiNs, "MediaSize");
    var sizeOption = insertElement(subfeature, dom, "Option", psfNs, interleavesMediaSize);

    if (interleavesMediaSize != mtiPrefix + ":UsePageMediaSize")    // must specify property scores for width height
    {
      insertIntScoredProperty(sizeOption, dom, "MediaSizeWidth", mtiNs, mediaSizeWidth);
      insertIntScoredProperty(sizeOption, dom, "MediaSizeHeight", mtiNs, mediaSizeHeight);
    }

    subfeature = insertFeature(interleavesNode, dom, mtiNs, "MediaType");
    insertElement(subfeature, dom, "Option", psfNs, interleavesMediaType);
//    paramValuesToPtpc(scriptContext, dom, interleavesNode, "MediaType");

    subfeature = insertFeature(interleavesNode, dom, mtiNs, "InputBin");
    insertElement(subfeature, dom, "Option", psfNs, interleavesInputBin);
 //   paramValuesToPtpc(scriptContext, dom, interleavesNode, "InputBin");
  }
}
function removeBlankPagesMediaException(scriptContext, printTicket)
{
    var blankSheetException = getFeature(printTicket.xmlNode, mtiNs, "DocumentBlankSheetException1");
    if (blankSheetException != null) blankSheetException.parentNode.removeChild(blankSheetException);
        blankSheetException = getFeature(printTicket.xmlNode, mtiNs, "DocumentBlankSheetException2");
    if (blankSheetException != null) blankSheetException.parentNode.removeChild(blankSheetException);

    var mediaException = getFeature(printTicket.xmlNode, mtiNs, "DocumentMediaException1");
    if (mediaException != null) mediaException.parentNode.removeChild(mediaException);
        mediaException = getFeature(printTicket.xmlNode, mtiNs, "DocumentMediaException2");
    if (mediaException != null) mediaException.parentNode.removeChild(mediaException);
}
function documentInsertPagesToPt(scriptContext, printTicket, devModeProperties) {
    var insertPagesMediaSize = devModeProperties.GetString("InsertEmptyPagesMediaSize");
    var insertPagesMediaType = devModeProperties.GetString("InsertEmptyPagesMediaType");
    var insertPagesInputBin = devModeProperties.GetString("InsertEmptyPagesInputBin");
    var insertPagesExceptionUsage = devModeProperties.GetString("InsertEmptyPagesExceptionUsage");
    var mediaSizeWidth = devModeProperties.GetInt32("InsertEmptyPagesMediaSizeWidth");
    var mediaSizeHeight = devModeProperties.GetInt32("InsertEmptyPagesMediaSizeHeight");
    var InsertPagesList = devModeProperties.GetString("InsertEmptyPagesList");

    var dom = printTicket.XmlNode;
    var rootElement = printTicket.XmlNode.documentElement;

    var InsertPagesFeature = getFeature(printTicket.xmlNode, mtiNs, "DocumentBlankSheetException1");
    if (InsertPagesFeature == null) return;

    InsertPagesFeature = getFeature(printTicket.xmlNode, mtiNs, "DocumentMediaException1");
    if (InsertPagesFeature == null) return;

    removeBlankPagesMediaException(scriptContext, printTicket);

        //Generates the Exceptions ticket if the insertMode != No InsertPages
    var InsertsMode;
    var ExceptionNode;

    // Insert Empty
    InsertsMode = "BeforeExceptionPages";
    ExceptionNode = insertFeature(rootElement, dom, mtiNs, "DocumentBlankSheetException1");
    insertOption(ExceptionNode, dom, mtiNs, InsertsMode, null);

    var subfeature = insertFeature(ExceptionNode, dom, mtiNs, "MediaSize");
    var sizeOption = insertElement(subfeature, dom, "Option", psfNs, insertPagesMediaSize);

    if (insertPagesMediaSize != mtiPrefix + ":UsePageMediaSize")    // must specify property scores for width height
    {
       insertIntScoredProperty(sizeOption, dom, "MediaSizeWidth", mtiNs, mediaSizeWidth);
       insertIntScoredProperty(sizeOption, dom, "MediaSizeHeight", mtiNs, mediaSizeHeight);
    }

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "MediaType");
    insertElement(subfeature, dom, "Option", psfNs, insertPagesMediaType);
//    paramValuesToPtpc(scriptContext, dom, ExceptionNode, "MediaType");

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "InputBin");
    insertElement(subfeature, dom, "Option", psfNs, insertPagesInputBin);
//    paramValuesToPtpc(scriptContext, dom, ExceptionNode, "InputBin");

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "ExceptionUsage");
    var exceptionUsageOptioNode = insertElement(subfeature, dom, "Option", psfNs, insertPagesExceptionUsage);
    paramValuesToPtpc(scriptContext, dom, ExceptionNode, "ExceptionUsage");

    insertRefScoredProperty(exceptionUsageOptioNode, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExceptionPages1");
    insertStringParameterInit(rootElement, dom, mtiNs, "DocumentExceptionPages1", InsertPagesList);

    // Insert Prints

    insertPagesMediaSize = devModeProperties.GetString("InsertPrintPagesMediaSize");
    insertPagesMediaType = devModeProperties.GetString("InsertPrintPagesMediaType");
    insertPagesInputBin = devModeProperties.GetString("InsertPrintPagesInputBin");
    insertPagesExceptionUsage = devModeProperties.GetString("InsertPrintPagesExceptionUsage");
    mediaSizeWidth = devModeProperties.GetInt32("InsertPrintPagesMediaSizeWidth");
    mediaSizeHeight = devModeProperties.GetInt32("InsertPrintPagesMediaSizeHeight");
    InsertPagesList = devModeProperties.GetString("InsertPrintPagesList");

    ExceptionNode = insertFeature(rootElement, dom, mtiNs, "DocumentMediaException1");
          // dummy option to comply with UNIDRVGUI rules
    insertOption(ExceptionNode, dom, mtiNs, "MediaException1", null);

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "MediaSize");
    sizeOption = insertElement(subfeature, dom, "Option", psfNs, insertPagesMediaSize);

    if (insertPagesMediaSize != mtiPrefix + ":UsePageMediaSize")    // must specify property scores for width height
    {
        insertIntScoredProperty(sizeOption, dom, "MediaSizeWidth", mtiNs, mediaSizeWidth);
        insertIntScoredProperty(sizeOption, dom, "MediaSizeHeight", mtiNs, mediaSizeHeight);
    }

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "MediaType");
    insertElement(subfeature, dom, "Option", psfNs, insertPagesMediaType);
//    paramValuesToPtpc(scriptContext, dom, ExceptionNode, "MediaType");

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "InputBin");
    insertElement(subfeature, dom, "Option", psfNs, insertPagesInputBin);
//    paramValuesToPtpc(scriptContext, dom, ExceptionNode, "InputBin");

    subfeature = insertFeature(ExceptionNode, dom, mtiNs, "ExceptionUsage");
    exceptionUsagOptionNode = insertElement(subfeature, dom, "Option", psfNs, insertPagesExceptionUsage);
    paramValuesToPtpc(scriptContext, dom, ExceptionNode, "ExceptionUsage");

    insertRefScoredProperty(exceptionUsagOptionNode, dom, "Pages", mtiNs, mtiPrefix + ":DocumentExceptionPages2");
    insertStringParameterInit(rootElement, dom, mtiNs, "DocumentExceptionPages2", InsertPagesList);
}

function Hex2Int16(hexstr) {
  var i16 = 0;
  for (ii = 0; ii < hexstr.length; ii++) {
    i16 = i16 * 16 + hexPattern.indexOf(hexstr.charAt(ii));
  }
  return i16;
}

function Hex2String(inputstr) {
  var outstr = "";
  for (i = 0; i < inputstr.length; i += 4) {
    hexstr = inputstr.substr(i, 4);
    hexvalue = Hex2Int16(hexstr);
    outstr += String.fromCharCode(hexvalue);
  }
  return outstr;
}

function paramValuesToPtpc(scriptContext, dom, xmlNode, featureName) {
  var featureName;
  var featureNode;
  var i;

  if (featureName.length == 0) return;
  featureNode = getFeature(xmlNode, pskNs, featureName);
  if (featureNode == null) featureNode = getFeature(xmlNode, mtiNs, featureName);
  if (featureNode == null) return;
  for (i = 0; i < featureNode.childNodes.length; i++) {
    if (featureNode.childNodes[i].nodeName == getQName("Option", psfNs)) {
      optionNode = featureNode.childNodes[i];
      optionName = optionNode.getAttribute("name");
      selectionString = null;
      selectionIndex = null;
      if (optionName) {
        if (featureName == "InputBin")
          searchKey = "paramValue." + "JobInputBin" + "." + optionName.substring(optionName.indexOf(":") + 1);
        else if (featureName == "MediaType")
          searchKey = "paramValue." + "PageMediaType" + "." + optionName.substring(optionName.indexOf(":") + 1);
        else
          searchKey = "paramValue." + featureName + "." + optionName.substring(optionName.indexOf(":") + 1);

        try {
          selectionIndex = scriptContext.DriverProperties.GetInt32(searchKey);
        }
        catch (e) {
          try {
            selectionString = scriptContext.DriverProperties.GetString(searchKey);
          }
          catch (e) {
            continue;
          }
        }

        if (selectionString != null)
          insertStringProperty(optionNode, dom, "SelectionString", mtiNs, selectionString);
        else if (selectionIndex != null)
          insertIntProperty(optionNode, dom, "SelectionIndex", mtiNs, selectionIndex);
      }

    }
  }

}


function ptToJobVars(printTicket, devModeProperties) {
  var prop = getProperty(printTicket.XmlNode.documentElement, mtiNs, "JobVars");
  if (prop) {
    var prop2 = getProperty(prop, mtiNs, "UserName");
    if (prop2)
      devModeProperties.SetString("UserName", prop2.firstChild.text);

    prop2 = getProperty(prop, mtiNs, "JobName");
    if (prop2)
      devModeProperties.SetString("JobName", prop2.firstChild.text);

    prop2 = getProperty(prop, mtiNs, "PIN");
    if (prop2)
      devModeProperties.SetString("PIN", prop2.firstChild.text);

    prop2 = getProperty(prop, mtiNs, "Password");
    if (prop2)
        devModeProperties.SetString("Password", prop2.firstChild.text);

    prop2 = getProperty(prop, mtiNs, "ShortcutName");
    if (prop2)
      devModeProperties.SetString("ShortcutName", prop2.firstChild.text);
  }
}

function jobVarsToPt(printTicket, scriptContext, devModeProperties) {
  var rootElement = printTicket.XmlNode.documentElement;
  var dom = printTicket.XmlNode;
  var prop = getProperty(rootElement, mtiNs, "JobVars");
  var prop2 = getProperty(rootElement, mtiNs, "DocumentStartPJL");
  var jobStorageNode = getFeature(dom, mtiNs, "JobStorage");
  var jobStorageUserNameNode = getFeature(dom, mtiNs, "JobStorageUserName");
  var jobStorageJobNameNode = getFeature(dom, mtiNs, "JobStorageJobName");
  var bSendPJL = false;
  try {
    if (scriptContext.DriverProperties.GetString("PDLMajorLevel").search("/vnd.hp-PCL6") != -1) 
      bSendPJL = true;
  } catch (e) {
    bSendPJL=false;
  }

  pjlIndex = 1;
  if (prop != null) 
    rootElement.removeChild(prop);

  if (prop2 != null) {
    rootElement.removeChild(prop2);
    prop2 = null;
  }

  prop = insertProperty(rootElement, dom, "JobVars", mtiNs);
  insertStringProperty(prop, dom, "DataType", mtiNs, "String");

// UserName
  if (devModeProperties.GetString("UserName").length > 0) {
      insertStringProperty(prop, dom, "UserName", mtiNs, devModeProperties.GetString("UserName"));
      if (jobStorageNode && jobStorageUserNameNode) {
          if(!(getOption(jobStorageNode, mtiNs, "JobStorageOff")) && !(getOption(jobStorageUserNameNode, mtiNs, "UserNameCurrent"))) {
              if (bSendPJL == true) {
                  if (prop2 == null) {
                      prop2 = insertProperty(rootElement, dom, "DocumentStartPJL", mtiNs);
                      insertStringProperty(prop2, dom, "DataType", mtiNs, "String");
                  }
                  insertStringProperty(prop2, dom, "PJL" + pjlIndex.toString(), mtiNs, "@PJL SET USERNAME=" + '"' + devModeProperties.GetString("UserName") + '"');
                  pjlIndex = pjlIndex + 1;
              }
          }
      }
  }
// JobName
  if (devModeProperties.GetString("JobName").length > 0) {
    insertStringProperty(prop, dom, "JobName", mtiNs, devModeProperties.GetString("JobName"));
    if (jobStorageNode && jobStorageJobNameNode) {
        if (!(getOption(jobStorageNode, mtiNs, "JobStorageOff")) && !(getOption(jobStorageJobNameNode, mtiNs, "JobNameAuto"))) {
            if (bSendPJL == true) {
                if (prop2 == null) {
                    prop2 = insertProperty(rootElement, dom, "DocumentStartPJL", mtiNs);
                    insertStringProperty(prop2, dom, "DataType", mtiNs, "String");
                }
                insertStringProperty(prop2, dom, "PJL" + pjlIndex.toString(), mtiNs, "@PJL SET JOBNAME=" + '"' + devModeProperties.GetString("JobName") + '"');
                pjlIndex = pjlIndex + 1;
            }
        }
    }
  }


  feature = getFeature(printTicket.xmlNode, mtiNs, "JobStoragePrivateSecure");
// PIN
  if (devModeProperties.GetString("PIN").length > 0) {
    insertStringProperty(prop, dom, "PIN", mtiNs, devModeProperties.GetString("PIN"));

    if (feature != null &&
      getOption(feature, mtiNs, "PrivateSecurePINtoPrint") != null) {
      if (bSendPJL == true) {
          if (prop2 == null) {
              prop2 = insertProperty(rootElement, dom, "DocumentStartPJL", mtiNs);
              insertStringProperty(prop2, dom, "DataType", mtiNs, "String");
          }
          var PINPJL = null;
        
          try {PINPJL=scriptContext.DriverProperties.GetString("JobStoragePIN.PJLCommand");}
          catch (e) {}

          if (PINPJL == null)
              PINPJL = "@PJL SET HOLDKEY";

          insertStringProperty(prop2, dom, "PJL" + pjlIndex.toString(), mtiNs, PINPJL + "=" + '"' + devModeProperties.GetString("PIN") + '"');
          try {insertStringParameterInit(rootElement, dom, mtiNs, "JobStoragePIN", devModeProperties.GetString("PIN"));}
          catch (e) { }
          pjlIndex = pjlIndex + 1;
      }
    }
  }

  if (devModeProperties.GetString("Password").length > 0) {
    insertStringProperty(prop, dom, "Password", mtiNs, devModeProperties.GetString("Password"));
    if (feature != null &&
          getOption(feature, mtiNs, "PrivateSecureEncryptJob") != null) {
      if (bSendPJL == true) {
        if (prop2 == null) {
          prop2 = insertProperty(rootElement, dom, "DocumentStartPJL", mtiNs);
          insertStringProperty(prop2, dom, "DataType", mtiNs, "String");
        }
//        insertStringProperty(prop2, dom, "PJL" + pjlIndex.toString(), mtiNs, "@PJL SET PASSWORD=" + devModeProperties.GetString("Password"));
          try {insertStringParameterInit(rootElement, dom, mtiNs, "JobStoragePassword", devModeProperties.GetString("Password"));}
          catch (e) {}
 //       pjlIndex = pjlIndex + 1;
      }
    }
  }

  insertStringProperty(prop, dom, "ShortcutName", mtiNs, devModeProperties.GetString("ShortcutName"));
 // prop2 = getProperty(rootElement, mtiNs, "DocumentEndPJL");
 // if (prop2 != null) rootElement.removeChild(prop2);
 // prop2 = insertProperty(rootElement, dom, "DocumentEndPJL", mtiNs);
 // insertStringProperty(prop2, dom, "DataType", mtiNs, "String");
 // insertStringProperty(prop2, dom, "PJL1", mtiNs, "@PJL EOJ");

}

function documentHybridRasterInfoToPt(printTicket, scriptContext)
{
    var rootElement = printTicket.XmlNode.documentElement;
    var dom = printTicket.XmlNode;

    try {
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentBandAlignmentHorizontal", scriptContext.DriverProperties.GetInt32("DocumentBandAlignmentHorizontal"));
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentBandAlignmentVertical", scriptContext.DriverProperties.GetInt32("DocumentBandAlignmentVertical"));
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentHPReverseScanLinesForDuplex", scriptContext.DriverProperties.GetInt32("DocumentHPReverseScanLinesForDuplex"));
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentJetReadyVersion", scriptContext.DriverProperties.GetInt32("DocumentJetReadyVersion"));
        insertIntParameterInit(rootElement, dom, mtiNs, "DocumentTagPlaneVersion", scriptContext.DriverProperties.GetInt32("DocumentTagPlaneVersion"));
        insertStringParameterInit(rootElement, dom, mtiNs, "DocumentRasterModeDocNames", scriptContext.DriverProperties.GetString("DocumentRasterModeDocNames"));
        }

    catch (e) {
    }

}

function jobDeviceToPt(printTicket, scriptContext)
{
    var rootElement = printTicket.XmlNode.documentElement;
    var dom = printTicket.XmlNode;
    var propertyNode;
    var mopier = "";
    var manual = "ns0000:ManualSimplex";

    try {
        mopier = scriptContext.QueueProperties.GetString("Config:DeviceCollationControl");

    }

    catch (e) {
        mopier = "";
    }

    if (mopier == "auto") {
		try {
			mopier = scriptContext.QueueProperties.GetString("Config:DeviceCollationControl_bidi");
		}

		catch (e) {
			mopier = "enable";
		}
	} else if (mopier == "automatic") {
        try {
			mopier = scriptContext.DriverProperties.GetString("FC.DeviceCollationControl");
		}

		catch (e) {
			mopier = "";
		}
	} else if (mopier == "Installed") {
        mopier = "enable";
    }
		
	var manualDuplexFeature = getFeature(rootElement, mtiNs, "JobManualDuplex");
	if (manualDuplexFeature != null) {
	    var optionNode = manualDuplexFeature.getElementsByTagName(getQName("Option", psfNs))[0];
	    if (optionNode != null) {
	        manual = optionNode.getAttribute("name");
	    }
	}

	if ((mopier == "enable") && (manual == "ns0000:ManualSimplex")) {
        propertyNode = getProperty(rootElement, mtiNs, "JobDeviceProperties");
        if (propertyNode != null) {
            rootElement.removeChild(propertyNode);
        }
        propertyNode = insertProperty(rootElement, dom, "JobDeviceProperties", mtiNs);
        insertStringProperty(propertyNode, dom, "DeviceCollation", mtiNs, "Installed");
    }
    else {
        propertyNode = getProperty(rootElement, mtiNs, "JobDeviceProperties");
        if (propertyNode != null) {
            rootElement.removeChild(propertyNode);
        }
        propertyNode = insertProperty(rootElement, dom, "JobDeviceProperties", mtiNs);
        insertStringProperty(propertyNode, dom, "DeviceCollation", mtiNs, "NotInstalled");
    }
}

function sleep(milliSeconds) {
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
}