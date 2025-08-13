"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "(pages-dir-node)/./src/pages/_app.tsx":
/*!****************************!*\
  !*** ./src/pages/_app.tsx ***!
  \****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _mui_material_styles__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @mui/material/styles */ \"(pages-dir-node)/./node_modules/@mui/material/esm/styles/index.js\");\n/* harmony import */ var _mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @mui/material/CssBaseline */ \"(pages-dir-node)/./node_modules/@mui/material/esm/CssBaseline/index.js\");\n/* harmony import */ var _mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @mui/x-date-pickers/LocalizationProvider */ \"@mui/x-date-pickers/LocalizationProvider\");\n/* harmony import */ var _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @mui/x-date-pickers/AdapterDayjs */ \"@mui/x-date-pickers/AdapterDayjs\");\n/* harmony import */ var leaflet_dist_leaflet_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! leaflet/dist/leaflet.css */ \"(pages-dir-node)/./node_modules/leaflet/dist/leaflet.css\");\n/* harmony import */ var leaflet_dist_leaflet_css__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(leaflet_dist_leaflet_css__WEBPACK_IMPORTED_MODULE_4__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_2__, _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_3__, _mui_material_styles__WEBPACK_IMPORTED_MODULE_5__, _mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_6__]);\n([_mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_2__, _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_3__, _mui_material_styles__WEBPACK_IMPORTED_MODULE_5__, _mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_6__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\n\n// Configurar iconos de Leaflet para evitar problemas de SSR\nif (false) {}\n// Tema personalizado para la aplicación meteorológica\nconst theme = (0,_mui_material_styles__WEBPACK_IMPORTED_MODULE_5__.createTheme)({\n    palette: {\n        mode: 'light',\n        primary: {\n            main: '#1976d2',\n            light: '#42a5f5',\n            dark: '#1565c0'\n        },\n        secondary: {\n            main: '#dc004e'\n        },\n        background: {\n            default: '#f5f5f5',\n            paper: '#ffffff'\n        },\n        success: {\n            main: '#4caf50'\n        },\n        warning: {\n            main: '#ff9800'\n        },\n        error: {\n            main: '#f44336'\n        },\n        info: {\n            main: '#2196f3'\n        }\n    },\n    typography: {\n        fontFamily: '\"Roboto\", \"Helvetica\", \"Arial\", sans-serif',\n        h1: {\n            fontSize: '2.5rem',\n            fontWeight: 500\n        },\n        h2: {\n            fontSize: '2rem',\n            fontWeight: 500\n        },\n        h3: {\n            fontSize: '1.75rem',\n            fontWeight: 500\n        },\n        h4: {\n            fontSize: '1.5rem',\n            fontWeight: 500\n        },\n        h5: {\n            fontSize: '1.25rem',\n            fontWeight: 500\n        },\n        h6: {\n            fontSize: '1rem',\n            fontWeight: 500\n        }\n    },\n    components: {\n        MuiCard: {\n            styleOverrides: {\n                root: {\n                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',\n                    borderRadius: '12px'\n                }\n            }\n        },\n        MuiAppBar: {\n            styleOverrides: {\n                root: {\n                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'\n                }\n            }\n        },\n        MuiChip: {\n            styleOverrides: {\n                root: {\n                    borderRadius: '16px'\n                }\n            }\n        }\n    }\n});\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_mui_material_styles__WEBPACK_IMPORTED_MODULE_5__.ThemeProvider, {\n        theme: theme,\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_mui_x_date_pickers_LocalizationProvider__WEBPACK_IMPORTED_MODULE_2__.LocalizationProvider, {\n            dateAdapter: _mui_x_date_pickers_AdapterDayjs__WEBPACK_IMPORTED_MODULE_3__.AdapterDayjs,\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_mui_material_CssBaseline__WEBPACK_IMPORTED_MODULE_6__[\"default\"], {}, void 0, false, {\n                    fileName: \"C:\\\\desarrollo\\\\proyectos\\\\estacion-metereologica\\\\frontend\\\\src\\\\pages\\\\_app.tsx\",\n                    lineNumber: 107,\n                    columnNumber: 9\n                }, this),\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                    ...pageProps\n                }, void 0, false, {\n                    fileName: \"C:\\\\desarrollo\\\\proyectos\\\\estacion-metereologica\\\\frontend\\\\src\\\\pages\\\\_app.tsx\",\n                    lineNumber: 108,\n                    columnNumber: 9\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"C:\\\\desarrollo\\\\proyectos\\\\estacion-metereologica\\\\frontend\\\\src\\\\pages\\\\_app.tsx\",\n            lineNumber: 106,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"C:\\\\desarrollo\\\\proyectos\\\\estacion-metereologica\\\\frontend\\\\src\\\\pages\\\\_app.tsx\",\n        lineNumber: 105,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBMEI7QUFFd0M7QUFDZDtBQUM0QjtBQUNoQjtBQUM5QjtBQUVsQyw0REFBNEQ7QUFDNUQsSUFBSSxLQUE2QixFQUFFLEVBU2xDO0FBRUQsc0RBQXNEO0FBQ3RELE1BQU1nQixRQUFRZCxpRUFBV0EsQ0FBQztJQUN4QmUsU0FBUztRQUNQQyxNQUFNO1FBQ05DLFNBQVM7WUFDUEMsTUFBTTtZQUNOQyxPQUFPO1lBQ1BDLE1BQU07UUFDUjtRQUNBQyxXQUFXO1lBQ1RILE1BQU07UUFDUjtRQUNBSSxZQUFZO1lBQ1ZDLFNBQVM7WUFDVEMsT0FBTztRQUNUO1FBQ0FDLFNBQVM7WUFDUFAsTUFBTTtRQUNSO1FBQ0FRLFNBQVM7WUFDUFIsTUFBTTtRQUNSO1FBQ0FTLE9BQU87WUFDTFQsTUFBTTtRQUNSO1FBQ0FVLE1BQU07WUFDSlYsTUFBTTtRQUNSO0lBQ0Y7SUFDQVcsWUFBWTtRQUNWQyxZQUFZO1FBQ1pDLElBQUk7WUFDRkMsVUFBVTtZQUNWQyxZQUFZO1FBQ2Q7UUFDQUMsSUFBSTtZQUNGRixVQUFVO1lBQ1ZDLFlBQVk7UUFDZDtRQUNBRSxJQUFJO1lBQ0ZILFVBQVU7WUFDVkMsWUFBWTtRQUNkO1FBQ0FHLElBQUk7WUFDRkosVUFBVTtZQUNWQyxZQUFZO1FBQ2Q7UUFDQUksSUFBSTtZQUNGTCxVQUFVO1lBQ1ZDLFlBQVk7UUFDZDtRQUNBSyxJQUFJO1lBQ0ZOLFVBQVU7WUFDVkMsWUFBWTtRQUNkO0lBQ0Y7SUFDQU0sWUFBWTtRQUNWQyxTQUFTO1lBQ1BDLGdCQUFnQjtnQkFDZEMsTUFBTTtvQkFDSkMsV0FBVztvQkFDWEMsY0FBYztnQkFDaEI7WUFDRjtRQUNGO1FBQ0FDLFdBQVc7WUFDVEosZ0JBQWdCO2dCQUNkQyxNQUFNO29CQUNKQyxXQUFXO2dCQUNiO1lBQ0Y7UUFDRjtRQUNBRyxTQUFTO1lBQ1BMLGdCQUFnQjtnQkFDZEMsTUFBTTtvQkFDSkUsY0FBYztnQkFDaEI7WUFDRjtRQUNGO0lBQ0Y7QUFDRjtBQUVlLFNBQVNHLElBQUksRUFBRUMsU0FBUyxFQUFFQyxTQUFTLEVBQVk7SUFDNUQscUJBQ0UsOERBQUNsRCwrREFBYUE7UUFBQ2UsT0FBT0E7a0JBQ3BCLDRFQUFDWiwwRkFBb0JBO1lBQUNnRCxhQUFhL0MsMEVBQVlBOzs4QkFDN0MsOERBQUNGLGlFQUFXQTs7Ozs7OEJBQ1osOERBQUMrQztvQkFBVyxHQUFHQyxTQUFTOzs7Ozs7Ozs7Ozs7Ozs7OztBQUloQyIsInNvdXJjZXMiOlsiQzpcXGRlc2Fycm9sbG9cXHByb3llY3Rvc1xcZXN0YWNpb24tbWV0ZXJlb2xvZ2ljYVxcZnJvbnRlbmRcXHNyY1xccGFnZXNcXF9hcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgdHlwZSB7IEFwcFByb3BzIH0gZnJvbSAnbmV4dC9hcHAnO1xuaW1wb3J0IHsgVGhlbWVQcm92aWRlciwgY3JlYXRlVGhlbWUgfSBmcm9tICdAbXVpL21hdGVyaWFsL3N0eWxlcyc7XG5pbXBvcnQgQ3NzQmFzZWxpbmUgZnJvbSAnQG11aS9tYXRlcmlhbC9Dc3NCYXNlbGluZSc7XG5pbXBvcnQgeyBMb2NhbGl6YXRpb25Qcm92aWRlciB9IGZyb20gJ0BtdWkveC1kYXRlLXBpY2tlcnMvTG9jYWxpemF0aW9uUHJvdmlkZXInO1xuaW1wb3J0IHsgQWRhcHRlckRheWpzIH0gZnJvbSAnQG11aS94LWRhdGUtcGlja2Vycy9BZGFwdGVyRGF5anMnO1xuaW1wb3J0ICdsZWFmbGV0L2Rpc3QvbGVhZmxldC5jc3MnO1xuXG4vLyBDb25maWd1cmFyIGljb25vcyBkZSBMZWFmbGV0IHBhcmEgZXZpdGFyIHByb2JsZW1hcyBkZSBTU1JcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICBjb25zdCBMID0gcmVxdWlyZSgnbGVhZmxldCcpO1xuICBcbiAgZGVsZXRlIChMLkljb24uRGVmYXVsdC5wcm90b3R5cGUgYXMgYW55KS5fZ2V0SWNvblVybDtcbiAgTC5JY29uLkRlZmF1bHQubWVyZ2VPcHRpb25zKHtcbiAgICBpY29uUmV0aW5hVXJsOiByZXF1aXJlKCdsZWFmbGV0L2Rpc3QvaW1hZ2VzL21hcmtlci1pY29uLTJ4LnBuZycpLFxuICAgIGljb25Vcmw6IHJlcXVpcmUoJ2xlYWZsZXQvZGlzdC9pbWFnZXMvbWFya2VyLWljb24ucG5nJyksXG4gICAgc2hhZG93VXJsOiByZXF1aXJlKCdsZWFmbGV0L2Rpc3QvaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyksXG4gIH0pO1xufVxuXG4vLyBUZW1hIHBlcnNvbmFsaXphZG8gcGFyYSBsYSBhcGxpY2FjacOzbiBtZXRlb3JvbMOzZ2ljYVxuY29uc3QgdGhlbWUgPSBjcmVhdGVUaGVtZSh7XG4gIHBhbGV0dGU6IHtcbiAgICBtb2RlOiAnbGlnaHQnLFxuICAgIHByaW1hcnk6IHtcbiAgICAgIG1haW46ICcjMTk3NmQyJyxcbiAgICAgIGxpZ2h0OiAnIzQyYTVmNScsXG4gICAgICBkYXJrOiAnIzE1NjVjMCcsXG4gICAgfSxcbiAgICBzZWNvbmRhcnk6IHtcbiAgICAgIG1haW46ICcjZGMwMDRlJyxcbiAgICB9LFxuICAgIGJhY2tncm91bmQ6IHtcbiAgICAgIGRlZmF1bHQ6ICcjZjVmNWY1JyxcbiAgICAgIHBhcGVyOiAnI2ZmZmZmZicsXG4gICAgfSxcbiAgICBzdWNjZXNzOiB7XG4gICAgICBtYWluOiAnIzRjYWY1MCcsXG4gICAgfSxcbiAgICB3YXJuaW5nOiB7XG4gICAgICBtYWluOiAnI2ZmOTgwMCcsXG4gICAgfSxcbiAgICBlcnJvcjoge1xuICAgICAgbWFpbjogJyNmNDQzMzYnLFxuICAgIH0sXG4gICAgaW5mbzoge1xuICAgICAgbWFpbjogJyMyMTk2ZjMnLFxuICAgIH0sXG4gIH0sXG4gIHR5cG9ncmFwaHk6IHtcbiAgICBmb250RmFtaWx5OiAnXCJSb2JvdG9cIiwgXCJIZWx2ZXRpY2FcIiwgXCJBcmlhbFwiLCBzYW5zLXNlcmlmJyxcbiAgICBoMToge1xuICAgICAgZm9udFNpemU6ICcyLjVyZW0nLFxuICAgICAgZm9udFdlaWdodDogNTAwLFxuICAgIH0sXG4gICAgaDI6IHtcbiAgICAgIGZvbnRTaXplOiAnMnJlbScsXG4gICAgICBmb250V2VpZ2h0OiA1MDAsXG4gICAgfSxcbiAgICBoMzoge1xuICAgICAgZm9udFNpemU6ICcxLjc1cmVtJyxcbiAgICAgIGZvbnRXZWlnaHQ6IDUwMCxcbiAgICB9LFxuICAgIGg0OiB7XG4gICAgICBmb250U2l6ZTogJzEuNXJlbScsXG4gICAgICBmb250V2VpZ2h0OiA1MDAsXG4gICAgfSxcbiAgICBoNToge1xuICAgICAgZm9udFNpemU6ICcxLjI1cmVtJyxcbiAgICAgIGZvbnRXZWlnaHQ6IDUwMCxcbiAgICB9LFxuICAgIGg2OiB7XG4gICAgICBmb250U2l6ZTogJzFyZW0nLFxuICAgICAgZm9udFdlaWdodDogNTAwLFxuICAgIH0sXG4gIH0sXG4gIGNvbXBvbmVudHM6IHtcbiAgICBNdWlDYXJkOiB7XG4gICAgICBzdHlsZU92ZXJyaWRlczoge1xuICAgICAgICByb290OiB7XG4gICAgICAgICAgYm94U2hhZG93OiAnMCAycHggOHB4IHJnYmEoMCwwLDAsMC4xKScsXG4gICAgICAgICAgYm9yZGVyUmFkaXVzOiAnMTJweCcsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgTXVpQXBwQmFyOiB7XG4gICAgICBzdHlsZU92ZXJyaWRlczoge1xuICAgICAgICByb290OiB7XG4gICAgICAgICAgYm94U2hhZG93OiAnMCAycHggOHB4IHJnYmEoMCwwLDAsMC4xNSknLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIE11aUNoaXA6IHtcbiAgICAgIHN0eWxlT3ZlcnJpZGVzOiB7XG4gICAgICAgIHJvb3Q6IHtcbiAgICAgICAgICBib3JkZXJSYWRpdXM6ICcxNnB4JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoeyBDb21wb25lbnQsIHBhZ2VQcm9wcyB9OiBBcHBQcm9wcykge1xuICByZXR1cm4gKFxuICAgIDxUaGVtZVByb3ZpZGVyIHRoZW1lPXt0aGVtZX0+XG4gICAgICA8TG9jYWxpemF0aW9uUHJvdmlkZXIgZGF0ZUFkYXB0ZXI9e0FkYXB0ZXJEYXlqc30+XG4gICAgICAgIDxDc3NCYXNlbGluZSAvPlxuICAgICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XG4gICAgICA8L0xvY2FsaXphdGlvblByb3ZpZGVyPlxuICAgIDwvVGhlbWVQcm92aWRlcj5cbiAgKTtcbn0iXSwibmFtZXMiOlsiUmVhY3QiLCJUaGVtZVByb3ZpZGVyIiwiY3JlYXRlVGhlbWUiLCJDc3NCYXNlbGluZSIsIkxvY2FsaXphdGlvblByb3ZpZGVyIiwiQWRhcHRlckRheWpzIiwiTCIsInJlcXVpcmUiLCJJY29uIiwiRGVmYXVsdCIsInByb3RvdHlwZSIsIl9nZXRJY29uVXJsIiwibWVyZ2VPcHRpb25zIiwiaWNvblJldGluYVVybCIsImljb25VcmwiLCJzaGFkb3dVcmwiLCJ0aGVtZSIsInBhbGV0dGUiLCJtb2RlIiwicHJpbWFyeSIsIm1haW4iLCJsaWdodCIsImRhcmsiLCJzZWNvbmRhcnkiLCJiYWNrZ3JvdW5kIiwiZGVmYXVsdCIsInBhcGVyIiwic3VjY2VzcyIsIndhcm5pbmciLCJlcnJvciIsImluZm8iLCJ0eXBvZ3JhcGh5IiwiZm9udEZhbWlseSIsImgxIiwiZm9udFNpemUiLCJmb250V2VpZ2h0IiwiaDIiLCJoMyIsImg0IiwiaDUiLCJoNiIsImNvbXBvbmVudHMiLCJNdWlDYXJkIiwic3R5bGVPdmVycmlkZXMiLCJyb290IiwiYm94U2hhZG93IiwiYm9yZGVyUmFkaXVzIiwiTXVpQXBwQmFyIiwiTXVpQ2hpcCIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyIsImRhdGVBZGFwdGVyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/pages/_app.tsx\n");

/***/ }),

/***/ "@mui/system":
/*!******************************!*\
  !*** external "@mui/system" ***!
  \******************************/
/***/ ((module) => {

module.exports = import("@mui/system");;

/***/ }),

/***/ "@mui/system/DefaultPropsProvider":
/*!***************************************************!*\
  !*** external "@mui/system/DefaultPropsProvider" ***!
  \***************************************************/
/***/ ((module) => {

module.exports = import("@mui/system/DefaultPropsProvider");;

/***/ }),

/***/ "@mui/system/InitColorSchemeScript":
/*!****************************************************!*\
  !*** external "@mui/system/InitColorSchemeScript" ***!
  \****************************************************/
/***/ ((module) => {

module.exports = import("@mui/system/InitColorSchemeScript");;

/***/ }),

/***/ "@mui/system/colorManipulator":
/*!***********************************************!*\
  !*** external "@mui/system/colorManipulator" ***!
  \***********************************************/
/***/ ((module) => {

module.exports = import("@mui/system/colorManipulator");;

/***/ }),

/***/ "@mui/system/createBreakpoints":
/*!************************************************!*\
  !*** external "@mui/system/createBreakpoints" ***!
  \************************************************/
/***/ ((module) => {

module.exports = import("@mui/system/createBreakpoints");;

/***/ }),

/***/ "@mui/system/createStyled":
/*!*******************************************!*\
  !*** external "@mui/system/createStyled" ***!
  \*******************************************/
/***/ ((module) => {

module.exports = import("@mui/system/createStyled");;

/***/ }),

/***/ "@mui/system/createTheme":
/*!******************************************!*\
  !*** external "@mui/system/createTheme" ***!
  \******************************************/
/***/ ((module) => {

module.exports = import("@mui/system/createTheme");;

/***/ }),

/***/ "@mui/system/cssVars":
/*!**************************************!*\
  !*** external "@mui/system/cssVars" ***!
  \**************************************/
/***/ ((module) => {

module.exports = import("@mui/system/cssVars");;

/***/ }),

/***/ "@mui/system/spacing":
/*!**************************************!*\
  !*** external "@mui/system/spacing" ***!
  \**************************************/
/***/ ((module) => {

module.exports = import("@mui/system/spacing");;

/***/ }),

/***/ "@mui/system/styleFunctionSx":
/*!**********************************************!*\
  !*** external "@mui/system/styleFunctionSx" ***!
  \**********************************************/
/***/ ((module) => {

module.exports = import("@mui/system/styleFunctionSx");;

/***/ }),

/***/ "@mui/system/useThemeProps":
/*!********************************************!*\
  !*** external "@mui/system/useThemeProps" ***!
  \********************************************/
/***/ ((module) => {

module.exports = import("@mui/system/useThemeProps");;

/***/ }),

/***/ "@mui/utils/deepmerge":
/*!***************************************!*\
  !*** external "@mui/utils/deepmerge" ***!
  \***************************************/
/***/ ((module) => {

module.exports = import("@mui/utils/deepmerge");;

/***/ }),

/***/ "@mui/utils/formatMuiErrorMessage":
/*!***************************************************!*\
  !*** external "@mui/utils/formatMuiErrorMessage" ***!
  \***************************************************/
/***/ ((module) => {

module.exports = import("@mui/utils/formatMuiErrorMessage");;

/***/ }),

/***/ "@mui/utils/generateUtilityClass":
/*!**************************************************!*\
  !*** external "@mui/utils/generateUtilityClass" ***!
  \**************************************************/
/***/ ((module) => {

module.exports = import("@mui/utils/generateUtilityClass");;

/***/ }),

/***/ "@mui/x-date-pickers/AdapterDayjs":
/*!***************************************************!*\
  !*** external "@mui/x-date-pickers/AdapterDayjs" ***!
  \***************************************************/
/***/ ((module) => {

module.exports = import("@mui/x-date-pickers/AdapterDayjs");;

/***/ }),

/***/ "@mui/x-date-pickers/LocalizationProvider":
/*!***********************************************************!*\
  !*** external "@mui/x-date-pickers/LocalizationProvider" ***!
  \***********************************************************/
/***/ ((module) => {

module.exports = import("@mui/x-date-pickers/LocalizationProvider");;

/***/ }),

/***/ "prop-types":
/*!*****************************!*\
  !*** external "prop-types" ***!
  \*****************************/
/***/ ((module) => {

module.exports = require("prop-types");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

module.exports = require("react");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

module.exports = require("react/jsx-runtime");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/@mui","vendor-chunks/leaflet"], () => (__webpack_exec__("(pages-dir-node)/./src/pages/_app.tsx")));
module.exports = __webpack_exports__;

})();