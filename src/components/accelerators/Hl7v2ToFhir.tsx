import { HttpRequestConfig, useAuthContext } from "@asgardeo/auth-react";
import { Box, Container } from "@mui/material";
import DOMPurify from "dompurify";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { HL7V2_TO_FHIR_URL } from "../../configs/Constants";
import { THROTTLED_OUT_PAGE_TITLE } from "../../configs/TextConstants";
import LoginOverlay from "../authentication/LoginOverlay";
import { ResponseAlert } from "../common";
import { DarkModeContext } from "../context/DarkModeContext";
import { SelectedSampleContext } from "../context/SelectedSampleContext";
import ErrorDisplay from "../error/ErrorDisplay";
import BasicTabs from "../execution/BasicTabs";
import { CodeEditor } from "../execution/CodeEditor";

interface State {
  input: string;
  output: string;
  errorMessage: string;
  isError: boolean;
  isLoading: boolean;
  alertOpen: boolean;
  outputType: string;
  statusCode: string;
}

export const Hl7v2ToFhir = () => {
  const [state, setState] = useState<State>({
    input: "",
    output: "",
    errorMessage: "",
    isError: false,
    isLoading: false,
    alertOpen: false,
    outputType: "json",
    statusCode: "500",
  });

  const [screenWidth, setScreenWidth] = React.useState<number>(
    window.innerWidth
  );
  const { state: authState } = useAuthContext();
  const { isAuthenticated = false } = authState;

  const { httpRequest } = useAuthContext();

  const handleResize = (): void => setScreenWidth(window.innerWidth);

  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    input,
    output,
    errorMessage,
    isError,
    isLoading,
    alertOpen,
    outputType,
    statusCode,
  } = state;

  const { loadSample, setLoadSample, selectedLabel, setSelectedLabel } =
    useContext(SelectedSampleContext);
  const { darkMode, setDarkMode } = useContext(DarkModeContext);

  const [response, setResponse] = useState<any>({
    statusCode: null,
    statusText: "",
    resUrl: "",
    contentType: "",
  });
  const [request, setRequest] = useState<any>({
    reqUrl: "",
    contentType: "",
    method: "",
  });

  useEffect(() => {
    if (selectedLabel == "HL7V2 To FHIR") {
      setState((prevState) => ({
        ...prevState,
        input: loadSample!.data,
        alertOpen: true,
      }));
      setLoadSample(null);
      setSelectedLabel("");
      setTimeout(() => {
        setState((prevState) => ({
          ...prevState,
          alertOpen: false,
        }));
      }, 2000);
    }
  }, [loadSample, selectedLabel, input]);

  const closeAlert = () => {
    setState((prevState) => ({
      ...prevState,
      alertOpen: false,
    }));
  };

  const closeResponse = () => {
    setState((prevState) => ({
      ...prevState,
      isError: false,
    }));
  };

  const handleInputChange = useCallback((value: string) => {
    setState((prevState) => ({
      ...prevState,
      input: value,
    }));
  }, []);

  const handleInputClear = () => {
    setState((prevState) => ({
      ...prevState,
      input: "",
    }));
  };

  const validateInput = () => {
    if (state.input !== "") {
      const cleanInput = DOMPurify.sanitize(state.input);
      setState((prevState) => ({
        ...prevState,
        input: cleanInput,
      }));
    }
  };

  const handleOutputClear = () => {
    setState((prevState) => ({
      ...prevState,
      output: "",
    }));
  };

  const readFile = (fileInput?: string | ArrayBuffer | null) => {
    if (typeof fileInput == "string") {
      setState((prevState) => ({
        ...prevState,
        input: fileInput,
      }));
    }
  };

  const callBackend = () => {
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      output: "",
      isError: false,
      errorMessage: "",
    }));

    validateInput();
    const Config = window.Config;
    const requestConfig: HttpRequestConfig = {
      url: Config.BFF_BASE_URL + HL7V2_TO_FHIR_URL,
      method: "POST",
      headers: {
        "Accept": "*application/json",
        "Content-Type": "text/plain",
      },
      data: input,
    };
    httpRequest(requestConfig)
      .then((res) => {
        setRequest({
          reqUrl: Config.BFF_BASE_URL + res.config["url"],
          contentType: res.headers["Content-Type"],
          method: res.config["method"]?.toUpperCase(),
        });
        setResponse({
          statusCode: res.status,
          statusText: res.statusText,
          resUrl: res.request["responseURL"],
          contentType: res.headers["content-type"],
        });
        setState((prevState) => ({
          ...prevState,
          output: JSON.stringify(res.data, null, 2),
          isLoading: false,
        }));
      })
      .catch((error) => {
        setState((prevState) => ({
          ...prevState,
          statusCode: error.response.status,
        }));
        setRequest({
          reqUrl: Config.BFF_BASE_URL + error.config["url"],
          contentType: error.config.headers["Content-Type"],
          method: error.config["method"]?.toUpperCase(),
        });
        setResponse({
          statusCode: error.response.status,
          statusText: error.response.statusText,
          resUrl: error.response.request["responseURL"],
          contentType: error.response.headers["content-type"],
        });
        setState((prevState) => ({
          ...prevState,
          output: JSON.stringify(error.response.data, null, 2),
          errorMessage:
            error.response.data.hasOwnProperty("issue") &&
            JSON.parse(error.response.data.issue[0].details.text).message,
          isError: true,
          isLoading: false,
        }));
      });
  };

  const inputEditor = (
    <CodeEditor
      title="HL7 Message"
      value={input}
      readOnly={!isAuthenticated}
      onChange={handleInputChange}
      darkMode={darkMode}
      onClear={handleInputClear}
      onExecute={callBackend}
      placeholder="Paste or edit HL7 message here..."
      fileType="textile"
      uploadEnabled
      readFile={readFile}
      clearEnabled
      width="100%"
      height="calc(100vh - 197px)"
      id="comp-hl7-to-fhir-input-editor"
      aria-label="HL7 Resource Editor"
      isDisabled={!isAuthenticated}
      executeButtonToolTipText="Perform transformation"
    />
  );

  const outputEditor = (
    <CodeEditor
      title="FHIR Resource"
      value={output}
      readOnly
      darkMode={darkMode}
      onClear={handleOutputClear}
      placeholder={
        isLoading ? "Loading..." : "FHIR Resource will be displayed here..."
      }
      fileType={outputType}
      downloadEnabled
      downloadName="hl7-to-fhir-output"
      clearEnabled
      width="100%"
      height="calc(100vh - 197px)"
      id="comp-hl7-to-fhir-output-editor"
      aria-label="FHIR Resource Editor"
      isDisabled={!isAuthenticated}
      isLoading={isLoading}
    />
  );

  return (
    <Container
      id="hl7v2-to-fhir-container"
      maxWidth={false}
      sx={{ display: "flex", flexDirection: "column", height: 1, mt: 0 }}
    >
      {alertOpen && (
        <ResponseAlert
          isOpen={alertOpen}
          severity="success"
          message="Sample Loaded"
          setIsOpen={closeAlert}
          id="response-alert-success"
          aria-label="Success Response Alert"
        />
      )}
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
        }}
        marginTop={5}
      >
        {screenWidth < 900 && (
          <>
            <BasicTabs
              inputEditor={inputEditor}
              outputEditor={outputEditor}
              isInterectable={isAuthenticated}
              statusCode={statusCode}
              isError={isError}
              errorMessage={errorMessage}
            ></BasicTabs>
          </>
        )}
        {screenWidth >= 900 && (
          <>
            {!isAuthenticated && <LoginOverlay />}
            <Box
              sx={{
                pr: 1,
                pb: 1,
                width: "50%",
              }}
              id="box-hl7-resource-box"
              aria-label="HL7 Resource Box"
            >
              {inputEditor}
            </Box>
            <Box
              sx={{
                pl: 1,
                pb: 1,
                width: "50%",
              }}
              id="box-fhir-resource-box"
              aria-label="FHIR Resource Box"
            >
              <>
                {isError && (
                  <ErrorDisplay
                    statusCode={statusCode == "500" ? "400" : statusCode}
                    message={
                      statusCode == "429"
                        ? THROTTLED_OUT_PAGE_TITLE
                        : errorMessage
                    }
                  />
                )}
                {outputEditor}
              </>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
};
