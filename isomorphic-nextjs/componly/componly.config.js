module.exports = {
    excludeComponents: ["SeverityPillRoot", "ThemeProvider", "Box", "Container", "Grid", "Stack", "Hidden", "Divider", "CardContent", "CardHeader", "CardActions", "TableHead", "TableRow", "TableCell", "TableBody", "TablePagination", "TableSortLabel"],
    includeHtmlComponents: ["button"],
    storyRegExp: /\.componly*(.jsx|.js)$/,
    importedFrom: [
        {
            "name": "Material ui",
            "search": "@mui",
            "main": "@mui/material",
            "match": "@mui/material",
            "icon": "/assets/uilibs/material-ui.png",
            "isDesignSystem": true
        },
        {
            "name": "Flowbite",
            "search": "flowbite",
            "main": "flowbite",
            "match": "flowbite",
            "icon": "/assets/uilibs/flowbite.svg",
            "isDesignSystem": true
        },
        {
            "name": "Bootstrap",
            "search": "react-bootstrap",
            "main": "react-bootstrap",
            "match": "react-bootstrap",
            "icon": "/assets/uilibs/bootstrap.png",
            "isDesignSystem": true
        },
        {
            "name": "Styled components",
            "search": "styled-components",
            "main": "styled-components",
            "match": "styled-components",
            "icon": "/assets/uilibs/styled-components.png",
            "isDesignSystem": true
        },
        {
            "name": "Emotion",
            "search": "@emotion",
            "main": "@emotion/react",
            "match": "@emotion/react",
            "icon": "/assets/uilibs/emotion.png",
            "isDesignSystem": true
        },
        {
            "name": "Chakra ui",
            "search": "@chakra-ui",
            "main": "@chakra-ui/react",
            "match": "@chakra-ui/react",
            "icon": "/assets/uilibs/chakra-ui.png",
            "isDesignSystem": true
        },
        {
            "name": "Semantic ui",
            "search": "semantic-ui-react",
            "main": "semantic-ui-react",
            "match": "semantic-ui-react",
            "icon": "/assets/uilibs/semantic-ui.png",
            "isDesignSystem": true
        },
        {
            "name": "Ant design",
            "search": "antd",
            "main": "antd",
            "match": "antd",
            "icon": "/assets/uilibs/antd.png",
            "isDesignSystem": false
        },
        {
            "name": "Tailwind",
            "search": "tailwindcss",
            "main": "tailwindcss",
            "match": "tailwindcss",
            "icon": "/assets/uilibs/tailwind.png",
            "isDesignSystem": true
        },
        {
            "name": "Html",
            "match": "*",
            "isDesignSystem": false
        }

    ],
    styles: {
        designsystem: {
            border: "1px solid green",
            boxShadow: "rgba(0, 0, 0, 0.35) 0px 5px 15px"
        },
        notdesignsystem: {
            border: "1px solid red"
        }
    }
};