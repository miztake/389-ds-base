import React from 'react';
import {
    Alert,
    BadgeToggle,
    Bullseye,
    Card, CardHeader, CardBody, CardTitle,
    Dropdown, DropdownItem, DropdownPosition,
    FormSelect, FormSelectOption,
    Grid, GridItem,
    Label, LabelGroup,
    Modal,
    ModalVariant,
    Pagination,
    SearchInput,
    SimpleList, SimpleListItem,
    Spinner,
    Text, TextContent, TextVariants,
    Title,
    Wizard,
} from '@patternfly/react-core';
import {
    Table, TableHeader, TableBody, TableVariant,
    breakWord,
    headerCol,
} from '@patternfly/react-table';
import {
    b64DecodeUnicode,
    foldLine,
    getBaseLevelEntryAttributes,
    getRdnInfo,
    generateUniqueId,
    getSingleValuedAttributes,
    modifyLdapEntry,
} from '../../lib/utils.jsx';
import EditableTable from '../../lib/editableTable.jsx';
import {
    LDAP_OPERATIONS,
    BINARY_ATTRIBUTES,
    LDIF_MAX_CHAR_PER_LINE
} from '../../lib/constants.jsx';

class EditLdapEntry extends React.Component {
    constructor (props) {
        super(props);

        this.originalEntryRows = [];
        this.singleValuedAttributes = [];
        this.requiredAttributes = ['dn'];
        this.operationColumns = [
            { title: 'Statement' },
            { title: 'Attribute' },
            { title: 'Value', cellTransforms: [breakWord] }
        ];

        this.state = {
            loading: true,
            isOCDropDownOpen: false,
            isAttrDropDownOpen: false,
            namingAttributeData: ['', ''],
            namingAttrPropsName: '',
            namingRowIndex: -1,
            namingAttribute: '',
            namingValue: '',
            editableTableData: [],
            statementRows: [],
            ldifArray: [],
            cleanLdifArray: [],
            validMods: false,
            commandOutput: '',
            resultVariant: 'default',
            stepIdReached: 1,
            itemCountOc: 0,
            pageOc: 1,
            perPageOc: 6,
            itemCountAttr: 0,
            pageAttr: 1,
            perPageAttr: 10,
            columnsAttr: [
                { title: 'Attribute Name', cellTransforms: [headerCol()] },
                { title: 'From ObjectClass' }
            ],
            columnsOc: [
                { title: 'ObjectClass Name', cellTransforms: [headerCol()] },
                { title: 'Required Attributes', cellTransforms: [breakWord] },
                { title: 'Optional Attributes', cellTransforms: [breakWord] }
            ],
            rowsOc: [],
            rowsAttr: [],
            pagedRowsOc: [],
            pagedRowsAttr: [],
            selectedObjectClasses: [],
            selectedAttributes: [],
            attrsToRemove: [],
            modifying: true,
        };

        this.onNext = ({ id }) => {
            this.setState({
                stepIdReached: this.state.stepIdReached < id ? id : this.state.stepIdReached
            });
            // The function updateValuesTableRows() is called upon new seletion(s)
            // Make sure the values table is updated in case no selection was made.
            if (id === 2) {
                // Just call this function in order to make sure the values table is up-to-date
                // even after navigating back and forth.
                this.updateAttributeTableRows();
            } else if (id === 3) {
                // Remove attributes from removed objectclasses
                this.cleanUpEntry();
            } else if (id === 4) {
                // Generate the LDIF data at step 4.
                this.generateLdifData();
            } else if (id === 6) {
                const params = { serverId: this.props.editorLdapServer };
                modifyLdapEntry(params, this.state.ldifArray, (result) => {
                    if (result.errorCode === 0) {
                        result.output = "Successfully modified entry"
                    }
                    this.setState({
                        commandOutput: result.output,
                        commandOutput: result.errorCode === 0 ? 'Successfully modified entry!' : 'Failed to modify entry, error: ' + result.errorCode ,
                        resultVariant: result.errorCode === 0 ? 'success' : 'danger',
                        modifying: false,
                    }, () => { this.props.onReload() }); // refreshes tableView
                    const opInfo = { // This is what refreshes treeView
                        operationType: 'MODIFY',
                        resultCode: result.errorCode,
                        time: Date.now()
                    }
                    this.props.setWizardOperationInfo(opInfo);
                });
            }
        };

        this.cleanUpEntry = () => {
            let newRows = [];
            let validMods = true;
            for (const row of this.state.editableTableData) {
                const attr = row.attr.toLowerCase();
                if (this.state.attrsToRemove.indexOf(attr) === -1) {
                    if (row.val === "") {
                        validMods = false;
                    }
                    newRows.push(row);
                }
            }

            this.setState({
                editableTableData: newRows,
                validMods,
            });
        }

        this.onOCSearchChange = (value, event) => {
            let ocRows = [];
            let allOCs = [];
            const val = value.toLowerCase();

            // Get fresh list of Objectclasses andwhat is selected
            this.props.allObjectclasses.map(oc => {
                let selected = false;
                let selectionDisabled = false;
                for (const selectedOC of this.state.selectedObjectClasses) {
                    if (selectedOC.cells[0].toLowerCase() === oc.name.toLowerCase()) {
                        selected = true;
                        break;
                    }
                }
                if (oc.name === "top") {
                    // Can not remove objectclass=top
                    selectionDisabled = true;
                }
                allOCs.push(
                    {
                        cells: [
                            oc.name,
                            oc.required.join(', '),
                            oc.optional.join(', '),
                        ],
                        selected: selected,
                        disableSelection: selectionDisabled
                    });
            });

            // Process search filter on the entire list
            if (value !== "") {
                for (const row of allOCs) {
                    const name = row.cells[0].toLowerCase();
                    const reqAttrs = row.cells[1].toLowerCase();
                    const optAttrs = row.cells[2].toLowerCase();
                    if (name.includes(val) || reqAttrs.includes(val) || optAttrs.includes(val)) {
                        ocRows.push(row);
                    }
                }
            } else {
                // Restore entire rowsOc list
                ocRows = allOCs;
            }

            this.setState({
                rowsOc: ocRows,
                pagedRowsOc: ocRows.slice(0, this.state.perPageOc),
            })
        }
        // End constructor().
    }

    isAttributeSingleValued = (attr) => {
        return this.singleValuedAttributes.includes(attr.toLowerCase());
    };

    isAttributeRequired = attr => {
        return this.requiredAttributes.includes(attr);
    }

    enableNextStep = (yes) => {
        this.setState({
            validMods: yes
        });
    };

    saveCurrentRows = (editableTableData) => {
        let validMods = true;
        for (const row of editableTableData) {
            if (row.val === "") {
                validMods = false;
                break;
            }
        }

        this.setState({
            editableTableData,
            validMods
        });
    }

    componentDidMount () {
        const ocArray = [];
        getSingleValuedAttributes(this.props.editorLdapServer,
            (myAttrs) => {
                this.singleValuedAttributes = [...myAttrs];
        });

        getBaseLevelEntryAttributes(this.props.editorLdapServer,
            this.props.wizardEntryDn,
            (entryDetails) => {
                let objectclasses = [];
                const rdnInfo = getRdnInfo(this.props.wizardEntryDn);
                let namingAttr = "";
                let namingValue = "";
                let namingIndex = -1;
                let attrPropsName = "";

                entryDetails
                .filter(data => (data.attribute + data.value !== '' && // Filter out empty lines
                data.attribute !== '???: ')) // and data for empty suffix(es) and in case of failure.
                .map((line, index) => {
                    const obj = {};
                    const attr = line.attribute;
                    const attrLowerCase = attr.trim().toLowerCase();
                    let namingAttribute = false;
                    let val = line.value.substring(1).trim();

                    if (attrLowerCase === "objectclass") {
                        objectclasses.push(val);
                    } else {
                        // Base64 encoded values
                        if (line.attribute === "dn") {
                            //return;
                        }
                        if (line.value.substring(0, 2) === '::') {
                            val = line.value.substring(3);
                            if (BINARY_ATTRIBUTES.includes(attrLowerCase)) {
                                // obj.fileUpload = true;
                                // obj.isDisabled = true;
                                if (attrLowerCase === 'jpegphoto') {
                                    const myPhoto = (<img
                                        src={`data:image/png;base64,${val}`}
                                        alt=""
                                        style={{ width: '48px' }} // height will adjust automatically.
                                        />);
                                    val = myPhoto;
                                } else if (attrLowerCase === 'nssymmetrickey') {
                                    // TODO: Check why the decoding of 'nssymmetrickey is failing...
                                    //   https://access.redhat.com/documentation/en-us/red_hat_directory_server/10
                                    //   /html/configuration_command_and_file_reference/core_server_configuration_reference#cnchangelog5-nsSymmetricKey
                                    //
                                    // Just show the encoded value at the moment.
                                    val = line.value.substring(3);
                                }
                            } else { // The value likely contains accented characters or has a trailing space.
                                val = b64DecodeUnicode(line.value.substring(3));
                            }
                        } else {
                            // Check for naming attribute
                            if (attr === rdnInfo.rdnAttr && val === rdnInfo.rdnVal) {
                                namingAttribute = true;
                                namingAttr = attr;
                                namingValue = val;
                            }
                        }

                        obj.id = generateUniqueId();
                        obj.attr = attr;
                        obj.val = val;
                        obj.namingAttr = namingAttribute;
                        obj.required = namingAttribute;
                        this.originalEntryRows.push(obj);
                    }
                });

                // Mark the existing objectclass classes as selected
                this.props.allObjectclasses.map(oc => {
                    let selected = false;
                    let selectionDisabled = false;
                    for (const entryOC of objectclasses) {
                        if (entryOC.toLowerCase() === oc.name.toLowerCase()) {
                            // Mark required attributes with selected OC's
                            for (let row of this.originalEntryRows) {
                                if (oc.required.includes(row.attr) || row.attr === "dn") {
                                    row.required = true;
                                }
                            }
                            selected = true;
                            break;
                        }
                    }
                    if (oc.name === "top") {
                        // Can not remove objectclass=top
                        selectionDisabled = true;
                    }
                    ocArray.push(
                        {
                            cells: [
                                oc.name,
                                oc.required.join(', '),
                                oc.optional.join(', '),
                            ],
                            selected: selected,
                            disableSelection: selectionDisabled
                        });
                });
                const selectedObjectClasses = ocArray
                    .filter(item => item.selected);

                this.setState({
                    itemCountOc: ocArray.length,
                    rowsOc: ocArray,
                    pagedRowsOc: ocArray.slice(0, this.state.perPageOc),
                    selectedObjectClasses,
                    editableTableData: [...this.originalEntryRows],
                    objectclasses: objectclasses,
                    namingAttribute: namingAttr,
                    namingValue: namingValue,
                    origAttrs: JSON.parse(JSON.stringify(this.originalEntryRows)),
                    origOC: JSON.parse(JSON.stringify(selectedObjectClasses)),
                    loading: false,
                }, () => {
                    this.updateAttributeTableRows();
                });
        });
    }

    onSetPageOc = (_event, pageNumber) => {
        this.setState({
            pageOc: pageNumber,
            pagedRowsOc: this.getItemsToShow(pageNumber, this.state.perPageOc, 'ObjectClassTable')
        });
    };

    onSetPageAttr = (_event, pageNumber) => {
        this.setState({
            pageAttr: pageNumber,
            pagedRowsAttr: this.getItemsToShow(pageNumber, this.state.perPageAttr, 'AttributeTable')
        });
    };

    onPerPageSelectOc = (_event, perPage) => {
        this.setState({
            pageOc: 1,
            perPageOc: perPage,
            pagedRowsOc: this.getItemsToShow(1, perPage, 'ObjectClassTable')
        });
    };

    onPerPageSelectAttr = (_event, perPage) => {
        this.setState({
            pageAttr: 1,
            perPageAttr: perPage,
            pagedRowsAttr: this.getItemsToShow(1, perPage, 'AttributeTable')
        });
    };

    getItemsToShow (page, perPage, option) {
        const start = (page - 1) * perPage;
        const end = page * perPage;
        const newRows = option === 'ObjectClassTable'
            ? this.state.rowsOc.slice(start, end)
            : option === 'AttributeTable'
                ? this.state.rowsAttr.slice(start, end)
                : [];
        return newRows;
    }

    onSelectOc = (event, isSelected, rowId) => {
        // Process only the entries in the current page ( pagedRowsOc )
        const rows = [...this.state.pagedRowsOc];
        rows[rowId].selected = isSelected;
        // Find the entry in the full array and set 'isAttributeSelected' accordingly
        // The property 'selected' is used to build the attribute table.
        // The row ID cannot be used since it changes with the pagination.
        const ocName = this.state.pagedRowsOc[rowId].cells[0];
        const allItems = [...this.state.rowsOc];
        const index = allItems.findIndex(item => item.cells[0] === ocName);
        allItems[index].selected = isSelected;

        let selectedObjectClasses = [...this.state.selectedObjectClasses];
        if (isSelected) {
            // Add to selected OC
            selectedObjectClasses.push(allItems[index]);
        } else {
            // Remove OC from selected list
            selectedObjectClasses = selectedObjectClasses.filter(row => (row.cells[0] !== allItems[index].cells[0]));
        }

        let attrsToRemove = [];
        if (!isSelected) {
            // Removing an objectclass, this will impact the entry as we might have to remove attributes
            let ocAttrs = allItems[index].cells[1].toLowerCase().replace(/\s/g, '').split(',');
            ocAttrs = ocAttrs.concat(allItems[index].cells[2].toLowerCase().replace(/\s/g, '').split(','));
            let currAttrs = [];
            for (const oc of selectedObjectClasses) {
                // Gather all the allowed attributes
                currAttrs = currAttrs.concat(oc.cells[1].toLowerCase().replace(/\s/g, '').split(','));
                currAttrs = currAttrs.concat(oc.cells[2].toLowerCase().replace(/\s/g, '').split(','));
            }

            for (const attr of ocAttrs) {
                if (currAttrs.indexOf(attr) === -1) {
                    // No other OC allows this attribute, it must go
                    attrsToRemove.push(attr);
                }
            }
        }

        this.setState({
            rowsOc: allItems,
            pagedRowsOc: rows,
            selectedObjectClasses,
            attrsToRemove,
        }, () => {
            this.updateAttributeTableRows();
        });
    };

    onSelectAttr = (event, isSelected, rowId) => {
        let newEditableData = this.state.editableTableData;
        let rows;

        // Quick hack until the code is upgraded to a version that supports "disableCheckbox"
        if (this.state.pagedRowsAttr[rowId].disableCheckbox === true) {
            return;
        } // End hack.

        // Process only the entries in the current page ( pagedRowsAttr )
        rows = [...this.state.pagedRowsAttr];
        rows[rowId].selected = isSelected;

        // Find the entry in the full array and set 'isAttributeSelected' accordingly
        // The property 'isAttributeSelected' is used to build the LDAP entry to add.
        // The row ID cannot be used since it changes with the pagination.
        const attrName = this.state.pagedRowsAttr[rowId].cells[0];
        const allItems = [...this.state.rowsAttr];
        const index = allItems.findIndex(item => item.cells[0] === attrName);
        allItems[index].isAttributeSelected = isSelected;
        const selectedAttributes = allItems
            .filter(item => item.isAttributeSelected)
            .map(attrObj => [attrObj.attributeName, attrObj.cells[1]]);

        // Update the table rows as needed
        const rowAttr = rows[rowId].attributeName.toLowerCase();
        const found = this.state.editableTableData.filter(item => (item.attr.toLowerCase() === rowAttr));
        if (isSelected) {
            if (found.length === 0 && rowAttr !== 'objectclass') {
                let obj = {};
                obj.id = generateUniqueId();
                obj.attr = rows[rowId].attributeName;
                obj.val = "";
                obj.namingAttr = false;
                obj.required = false;
                newEditableData =  [...newEditableData, obj]
            }
        } else if (found.length > 0) {
            // Remove the row if present
            newEditableData = this.state.editableTableData.filter(item => (item.attr.toLowerCase() !== rowAttr));
        }

        let validMods = true;
        for (const row of newEditableData) {
            if (row.val === "") {
                validMods = false
            }
        }

        this.setState({
            rowsAttr: allItems,
            pagedRowsAttr: rows,
            editableTableData: newEditableData,
            selectedAttributes,
            validMods
        });
    };

    updateAttributeTableRows = () => {
        const ocToProcess = [...this.state.selectedObjectClasses];
        const rowsAttr = [];
        const attrList = [];

        ocToProcess.map(oc => {
            // Rebuild the attribute arrays.
            const required = oc.cells[1].split(',');
            const optional = oc.cells[2].split(',');

            for (const attr of required) {
                attr = attr.trim().toLowerCase();
                if (attr === '') {
                    continue;
                }

                if (!attrList.includes(attr)) {
                    attrList.push(attr);
                    rowsAttr.push({
                        selected: true,
                        disableCheckbox: true, // TODO: Hack until upgrading!
                        isAttributeSelected: true,
                        attributeName: attr,
                        cells: [{
                            title: (
                                <>
                                    <strong>{attr}</strong>
                                </>
                            )
                        },
                        oc.cells[0]]
                    });
                }

                // Loop over entry attributes and add the attribute, with an
                // empty value, to the editableTableData
                const found = this.state.editableTableData.filter(item => (item.attr.toLowerCase() === attr));
                if (found.length === 0 && attr !== 'objectclass') {
                    let obj = {};
                    obj.id = generateUniqueId();
                    obj.attr = attr;
                    obj.val = "";
                    obj.namingAttr = false;
                    obj.required = false;

                    this.setState(prevState => ({
                        editableTableData: [...prevState.editableTableData, obj],
                        validMods: false,
                    }));
                }
            }

            for (const attr of optional) {
                attr = attr.trim();
                if (attr === '') {
                    continue;
                }
                if (!attrList.includes(attr)) {
                    let selected = false;
                    for (const existingRow of this.state.editableTableData) {
                        if (existingRow.attr.toLowerCase() === attr.toLowerCase()) {
                            selected = true;
                            break;
                        }
                    }

                    attrList.push(attr);
                    rowsAttr.push({
                        attributeName: attr,
                        isAttributeSelected: selected,
                        selected: selected,
                        cells: [attr, oc.cells[0]]
                    });
                }
            }

            // If we're editing a user then add nsRoleDN attribute to the possible list
            let personOC = false;
            for (const existingOC of this.state.selectedObjectClasses) {
                if (existingOC.cells[0].toLowerCase() === 'person' ||
                   existingOC.cells[0].toLowerCase() === 'nsperson') {
                    personOC = true;
                    break;
                }
            }
            let roleDNAttr = 'nsRoleDN'
            if ((personOC && !attrList.includes(roleDNAttr))) {
                let selected = false;
                for (const existingRow of this.state.editableTableData) {
                    if (existingRow.attr.toLowerCase() === roleDNAttr.toLowerCase()) {
                        selected = true;
                        break;
                    }
                }

                attrList.push(roleDNAttr);
                rowsAttr.push({
                    attributeName: roleDNAttr,
                    isAttributeSelected: selected,
                    selected: selected,
                    cells: [roleDNAttr, '']
                });
            }
        });

        // Update the rows where user can select the attributes.
        rowsAttr.sort((a, b) => (a.attributeName > b.attributeName) ? 1 : -1)
        this.setState({
            rowsAttr,
            selectedAttributes: rowsAttr.filter(item => item.isAttributeSelected)
                .map(attrObj => [attrObj.attributeName, attrObj.cells[1]]),
            itemCountAttr: rowsAttr.length,
        }, () => {
            // getItemsToShow() expects rowAttrs to be updated already, so we
            // have to do this callback
            this.setState({
                pagedRowsAttr: this.getItemsToShow(this.state.pageAttr, this.state.perPageAttr,
                'AttributeTable')
            });
        });
    };

    generateLdifData = () => {
        const statementRows = [];
        const ldifArray = [];
        const ldifArrayClean = []; // Masks userpassword
        const updateArray = [];
        const addArray = [];
        const removeArray = [];
        let numOfChanges = 0;

        // Check for row changes
        for (const originalRow of this.originalEntryRows) {
            // Check if the value has been changed by comparing
            // the unique IDs and the values.
            const matchingObj = this.state.editableTableData.find(elt => (elt.id === originalRow.id));

            // Check if original row was removed
            if (!matchingObj) {
                removeArray.push(originalRow);
                continue;
            }

            // Now check the value.
            const sameValue = matchingObj.val === originalRow.val;
            if (sameValue) {
                updateArray.push({ ...originalRow });
            } else {
                // Value has changed.
                const myNewObject = {
                    ...originalRow,
                    op: LDAP_OPERATIONS.replace,
                    new: matchingObj.val
                };

                if (matchingObj.encodedValue) {
                    myNewObject.encodedValue = matchingObj.encodedValue;
                }
                updateArray.push(myNewObject);
            }
        }

        // Check for new rows
        for (const savedRow of this.state.editableTableData) {
            let found = false;
            for (const originalRow of this.originalEntryRows) {
                if (originalRow.id === savedRow.id) {
                    // Found, its not new
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Add new row
                addArray.push(savedRow);
            }
            found = false;
        }

        for (const datum of updateArray) {
            const myAttr = datum.attr;
            const myVal = datum.val;
            const isUserPwd = myAttr.toLowerCase() === "userpassword";

            if (myAttr === 'dn') { // Entry DN.
                ldifArray.push(`dn: ${myVal}`); // DN line.
                ldifArray.push('changetype: modify'); // To modify the entry.
            }
            if (datum.op === undefined) { // Unchanged value.
                statementRows.push({
                    cells: [
                        { title: (<Label>Keep</Label>) },
                        myAttr,
                        myVal
                    ]
                });
            } else { // Value was updated.
                if (ldifArray.length >= 4) { // There was already a first round of attribute replacement.
                    ldifArray.push('-');
                }

                const sameAttrArray = this.originalEntryRows.filter(obj => obj.attr === myAttr);
                const mySeparator = (BINARY_ATTRIBUTES.includes(myAttr.toLowerCase()))
                    ? '::'
                    : ':';

                if (sameAttrArray.length > 1) {
                    // The attribute has multiple values.
                    // We need to delete the specific value and add the new one.
                    ldifArray.push(`delete: ${myAttr}`);
                    ldifArray.push(`${myAttr}: ${myVal}`);
                    ldifArray.push('-');
                    ldifArray.push(`add: ${myAttr}`);
                } else {
                    // There is a single value for the attribute.
                    // A "replace" statement is enough.
                    ldifArray.push(`replace: ${myAttr}`);
                }

                const valueToUse = datum.encodedValue
                    ? datum.encodedValue
                    : datum.new;
                // foldLine() will return the line as is ( in an array though )
                // if its length is smaller than 78.
                // Otherwise the line is broken into smaller ones ( 78 characters max per line ).
                const remainingData = foldLine(`${myAttr}${mySeparator} ${valueToUse}`);
                ldifArray.push(...remainingData);
                numOfChanges++;
                if (isUserPwd) {
                    datum.new = "********";
                    myVal = "********";
                }
                statementRows.push({
                    cells: [
                        { title: (<Label color="orange">Replace</Label>) },
                        myAttr,
                        {
                            title: (
                                <LabelGroup isVertical>
                                    <Label variant="outline" color="red">
                                        <em>old:</em>&ensp;{myVal}
                                    </Label>
                                    <Label variant="outline" color="blue" isTruncated>
                                        <em>new:</em>&ensp;{datum.new}
                                    </Label>
                                </LabelGroup>
                            )
                        }
                    ]
                });
            }
        } // End updateArray loop.

        // Loop add rows
        for (const datum of addArray) {
            const myAttr = datum.attr;
            let myVal = datum.val;
            const isUserPwd = myAttr.toLowerCase() === "userpassword";
            numOfChanges++;

            // Update LDIF array
            if (ldifArray.length >= 4) { // There was already a first round of attribute replacement.
                ldifArray.push('-');
            }
            ldifArray.push('add: ' + myAttr);

            const remainingData = foldLine(`${myAttr}: ${myVal}`);
            ldifArray.push(...remainingData);

            if (isUserPwd) {
                myVal = "********";
            }

            // Update Table
            statementRows.push({
                cells: [
                    { title: (<Label color="orange">Add</Label>) },
                    myAttr,
                    {
                        title: (
                            <Label variant="outline" color="blue" isTruncated>
                                {myVal}
                            </Label>
                        )
                    }
                ]
            });
        }

        // Loop delete rows
        for (const datum of removeArray) {
            const myAttr = datum.attr;
            const myVal = datum.val;
            const isUserPwd = myAttr.toLowerCase() === "userpassword";
            // Update LDIF array
            if (ldifArray.length >= 4) { // There was already a first round of attribute replacement.
                ldifArray.push('-');
            }

            ldifArray.push('delete: ' + myAttr);
            numOfChanges++;
            if (!isUserPwd) {
                const remainingData = foldLine(`${myAttr}: ${myVal}`);
                ldifArray.push(...remainingData);
            } else {
                myVal = "********";
            }

            // Update Table
            statementRows.push({
                cells: [
                    { title: (<Label color="red">Delete</Label>) },
                    myAttr,
                    {
                        title: (
                            <Label variant="outline" color="blue" isTruncated>
                                {myVal}
                            </Label>
                        )
                    }
                ]
            });
        }

        // Handle Objectclass changes
        const origOCs = this.state.origOC.map(oc => { return oc.cells[0].toLowerCase() });
        const newOCs = this.state.selectedObjectClasses.map(oc => { return oc.cells[0].toLowerCase() });
        for (const oldOC of origOCs) {
            if (newOCs.indexOf(oldOC) === -1) {
                if (ldifArray.length >= 4) {
                    ldifArray.push('-');
                }
                ldifArray.push('delete: objectClass');
                ldifArray.push('objectClass: ' + oldOC);
                statementRows.push({
                    cells: [
                        { title: (<Label color="red">Delete</Label>) },
                        'objectClass',
                        {
                            title: (
                                <Label variant="outline" color="blue" isTruncated>
                                    {oldOC}
                                </Label>
                            )
                        }
                    ]
                });
                numOfChanges++;
            }
        }
        for (const newOC of newOCs) {
            if (origOCs.indexOf(newOC) === -1) {
                if (ldifArray.length >= 4) {
                    ldifArray.push('-');
                }
                ldifArray.push('add: objectClass');
                ldifArray.push('objectClass: ' + newOC);
                statementRows.push({
                    cells: [
                        { title: (<Label color="orange">Add</Label>) },
                        'objectClass',
                        {
                            title: (
                                <Label variant="outline" color="blue" isTruncated>
                                    {newOC}
                                </Label>
                            )
                        }
                    ]
                });
                numOfChanges++;
            }
        }

        // Hide userpassword value
        let cleanLdifArray = [...ldifArray];
        for (let idx in cleanLdifArray) {
            if (cleanLdifArray[idx].toLowerCase().startsWith("userpassword")) {
                cleanLdifArray[idx] = "userpassword: ********";
                break;
            }
        }

        this.setState({
            statementRows,
            ldifArray,
            cleanLdifArray,
            numOfChanges: numOfChanges
        });
    }

    onOCDropDownToggle = isOpen => {
        this.setState({
            isOCDropDownOpen: isOpen
        });
    };

    onOCDropDownSelect = event => {
        this.setState((prevState, props) => {
            return { isOCDropDownOpen: !prevState.isOCDropDownOpen };
        });
    };

    buildOCDropdown= () => {
        const { isOCDropDownOpen, selectedObjectClasses } = this.state;
        const numSelected = this.state.rowsOc.filter(item => item.selected).length;
        const items = this.state.selectedObjectClasses.map((oc) =>
            <DropdownItem key={oc.cells[0]}>{oc.cells[0]}</DropdownItem>
        );

        return (
            <Dropdown
                className="ds-dropdown-padding"
                onSelect={this.onOCDropDownSelect}
                position={DropdownPosition.left}
                toggle={
                    <BadgeToggle id="toggle-oc-select" onToggle={this.onOCDropDownToggle}>
                        {numSelected !== 0 ? <>{numSelected} selected </> : <>0 selected </>}
                    </BadgeToggle>
                }
                isOpen={isOCDropDownOpen}
                dropdownItems={items}
            />
        );
    }

    onAttrDropDownToggle = isOpen => {
        this.setState({
            isAttrDropDownOpen: isOpen
        });
    };

    onAttrDropDownSelect = event => {
        this.setState((prevState, props) => {
            return { isAttrDropDownOpen: !prevState.isAttrDropDownOpen };
        });
    };

    buildAttrDropdown = () => {
        const { isAttrDropDownOpen, selectedAttributes } = this.state;
        const numSelected = selectedAttributes.length;
        const items = selectedAttributes.map((attr) =>
            <DropdownItem key={attr[0]}>{attr[0]}</DropdownItem>
        );

        return (
            <Dropdown
                className="ds-dropdown-padding"
                onSelect={this.onAttrDropDownSelect}
                position={DropdownPosition.left}
                toggle={
                    <BadgeToggle id="toggle-attr-select" onToggle={this.onAttrDropDownToggle}>
                        {numSelected !== 0 ? <>{numSelected} selected </> : <>0 selected </>}
                    </BadgeToggle>
                }
                isOpen={isAttrDropDownOpen}
                dropdownItems={items}
            />
        );
    }

    render () {
        const {
            loading, itemCountOc, pageOc, perPageOc, columnsOc, pagedRowsOc,
            itemCountAttr, pageAttr, perPageAttr, columnsAttr, pagedRowsAttr,
            commandOutput, namingAttribute, namingValue, stepIdReached,
            itemCount, pageAddUser, perPageAddUser, ldifArray, statementRows,
            resultVariant, editableTableData, numOfChanges,
            validMods, cleanLdifArray
        } = this.state;

        const loadingStateRows = [{
            heightAuto: true,
            cells: [
                {
                    props: { colSpan: 8 },
                    title: (
                        <Bullseye key="add-entry-bulleye" >
                            <Title headingLevel="h2" size="lg" key="loading-title" >
                                Loading...
                            </Title>
                            <center><Spinner size="xl" key="loading-spinner" /></center>
                        </Bullseye>
                    )
                },
                'Loading...',
                'Loading...'
            ]
        }];

        const objectClassStep = (
            <>
                <div className="ds-container">
                    <TextContent>
                        <Text component={TextVariants.h3}>
                            Select ObjectClasses
                        </Text>
                    </TextContent>
                    {this.buildOCDropdown()}
                </div>
                { loading &&
                    <div>
                        <Bullseye className="ds-margin-top-xlg" key="add-entry-bulleye" >
                            <Title headingLevel="h3" size="lg" key="loading-title">
                                Loading ObjectClasses ...
                            </Title>
                        </Bullseye>
                        <Spinner className="ds-center" size="lg" key="loading-spinner" />
                    </div>
                }
                <div className={loading ? "ds-hidden" : ""}>
                    <Grid className="ds-margin-top-lg">
                        <GridItem span={5}>
                            <SearchInput
                                className="ds-font-size-md"
                                placeholder='Search Objectclasses'
                                value={this.state.searchValue}
                                onChange={this.onOCSearchChange}
                                onClear={(evt) => this.onOCSearchChange('', evt)}
                            />
                        </GridItem>
                        <GridItem span={7}>
                            <Pagination
                                value="ObjectClassTable"
                                itemCount={this.state.itemCountOc}
                                page={this.state.pageOc}
                                perPage={this.state.perPageOc}
                                onSetPage={this.onSetPageOc}
                                widgetId="pagination-step-objectclass"
                                onPerPageSelect={this.onPerPageSelectOc}
                                variant="top"
                                isCompact
                            />
                        </GridItem>
                    </Grid>
                    <Table
                        cells={columnsOc}
                        rows={pagedRowsOc}
                        canSelectAll={false}
                        onSelect={this.onSelectOc}
                        variant={TableVariant.compact}
                        aria-label="Pagination All ObjectClasses"
                    >
                        <TableHeader />
                        <TableBody />
                    </Table>
                </div>
            </>
        );

        const attributeStep = (
            <>
                <div className="ds-container">
                    <TextContent>
                        <Text component={TextVariants.h3}>
                            Select Attributes
                        </Text>
                    </TextContent>
                    {this.buildAttrDropdown()}
                </div>
                <Table
                    className="ds-margin-top"
                    cells={columnsAttr}
                    rows={pagedRowsAttr}
                    onSelect={this.onSelectAttr}
                    variant={TableVariant.compact}
                    aria-label="Pagination Attributes"
                    canSelectAll={false}
                >
                    <TableHeader />
                    <TableBody />
                </Table>
                <Pagination
                    itemCount={itemCountAttr}
                    page={pageAttr}
                    perPage={perPageAttr}
                    onSetPage={this.onSetPageAttr}
                    widgetId="pagination-step-attributes"
                    onPerPageSelect={this.onPerPageSelectAttr}
                    dropDirection="up"
                    isCompact
                />
            </>
        );

        const myTitle = 'DN ( Distinguished Name )';
        const entryValuesStep = (
            <>
                <TextContent>
                    <Text component={TextVariants.h3}>
                        Edit Attribute Values
                    </Text>
                </TextContent>
                <EditableTable
                    key={editableTableData}
                    wizardEntryDn={this.props.wizardEntryDn}
                    editableTableData={editableTableData}
                    quickUpdate
                    isAttributeSingleValued={this.isAttributeSingleValued}
                    isAttributeRequired={this.isAttributeRequired}
                    enableNextStep={this.enableNextStep}
                    saveCurrentRows={this.saveCurrentRows}
                    allObjectclasses={this.props.allObjectclasses}
                    disableNamingChange
                />
            </>
        );

        const ldifListItems = cleanLdifArray.map((line, index) =>
            <SimpleListItem key={index} isCurrent={line.startsWith('dn: ')}>
                {line}
            </SimpleListItem>
        );

        const ldifStatementsStep = (
            <div>
                <div className="ds-addons-bottom-margin">
                    <Alert
                        variant="info"
                        isInline
                        title="LDIF Statements"
                    />
                </div>
                <Card isSelectable>
                    <CardBody>
                        { (ldifListItems.length > 0) &&
                            <SimpleList aria-label="LDIF data User">
                                {ldifListItems}
                            </SimpleList>
                        }
                    </CardBody>
                </Card>
            </div>
        );

        let nb = -1;
        const ldifLines = ldifArray.map(line => {
            nb++;
            return { data: line, id: nb };
        });

        const entryReviewStep = (
            <div>
                <div className="ds-addons-bottom-margin">
                    <Alert
                        variant={resultVariant}
                        isInline
                        title="Result for Entry Modification"
                    >
                        {commandOutput}
                        {this.state.adding &&
                            <div>
                                <Spinner className="ds-left-margin" size="md" />
                                &nbsp;&nbsp;Modifying entry ...
                            </div>
                        }
                    </Alert>
                </div>
                {resultVariant === 'danger' &&
                    <Card isSelectable>
                        <CardTitle>LDIF Data</CardTitle>
                        <CardBody>
                            {ldifLines.map((line) => (
                                <h6 key={line.id}>{line.data}</h6>
                            ))}
                        </CardBody>
                    </Card>
                }
            </div>
        );

        const editEntrySteps = [
            {
                id: 1,
                name: 'Select ObjectClasses',
                component: objectClassStep,
                canJumpTo: stepIdReached >= 1 && stepIdReached < 6,
                enableNext: this.state.selectedObjectClasses.length > 0,
                hideBackButton: true
            },
            {
                id: 2,
                name: 'Select Attributes',
                component: attributeStep,
                canJumpTo: stepIdReached >= 2 && stepIdReached < 6,
            },
            {
                id: 3,
                name: 'Edit Values',
                component: entryValuesStep,
                canJumpTo: stepIdReached >= 3 && stepIdReached < 6,
                enableNext: validMods
            },
            {
                id: 4,
                name: 'View Changes',
                component: (
                    <Table
                        aria-label="Statement Table"
                        variant="compact"
                        cells={this.operationColumns}
                        rows={statementRows}
                    >
                        <TableHeader />
                        <TableBody />
                    </Table>
                ),
                canJumpTo: stepIdReached >= 4 && stepIdReached < 6,
                enableNext: numOfChanges > 0
            },
            {
                id: 5,
                name: 'LDIF Statements',
                component: ldifStatementsStep,
                nextButtonText: 'Modify Entry',
                canJumpTo: stepIdReached >= 5 && stepIdReached < 6
            },
            {
                id: 6,
                name: 'Review Result',
                component: entryReviewStep,
                nextButtonText: 'Finish',
                canJumpTo: stepIdReached > 6,
                hideBackButton: true,
                enableNext: !this.state.modifying
            }
        ];

        const title = <>
            Entry DN: &nbsp;&nbsp;<strong>{this.props.wizardEntryDn}</strong>
        </>;

        return (
            <Wizard
                isOpen={this.props.isWizardOpen}
                onClose={this.props.toggleOpenWizard}
                steps={editEntrySteps}
                title="Edit An LDAP Entry"
                description={title}
                onNext={this.onNext}
            />
        );
    }
}

export default EditLdapEntry;
