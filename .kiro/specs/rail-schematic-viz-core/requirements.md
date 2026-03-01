# Requirements Document

## Introduction

The rail-schematic-viz-core package provides the foundational capabilities for the Rail Schematic Viz library. This package implements the core data model, coordinate systems, data parsers (railML® 3, JSON, Builder API), basic SVG rendering engine, and the CoordinateBridge for linear referencing. It serves as the base layer upon which layout modes, overlays, and framework adapters will be built in subsequent specifications.

## Glossary

- **RailGraph**: The core data structure representing a railway network as a directed graph
- **RailNode**: A vertex in the RailGraph representing stations, junctions, or track endpoints
- **RailEdge**: A directed edge in the RailGraph representing track segments between nodes
- **RailLine**: A logical grouping of edges representing a named railway line or route
- **Parser**: A component that transforms external data formats into the RailGraph model
- **Renderer**: A component that generates SVG output from the RailGraph model
- **CoordinateBridge**: A bidirectional projection system between linear and screen coordinates
- **Linear_Coordinate**: A position expressed as distance along a track (e.g., km 42.5)
- **Screen_Coordinate**: A position expressed in SVG viewport units (x, y pixels)
- **Geographic_Coordinate**: A position expressed in latitude/longitude (WGS84)
- **railML**: An XML-based standard for railway data exchange (version 3.x)
- **Builder_API**: A programmatic interface for constructing RailGraph instances
- **Track_Primitive**: A basic geometric element (straight, curve, switch) used in rendering
- **Switch_Template**: A predefined rendering pattern for railway switches and crossovers
- **Styling_Configuration**: User-defined visual properties for track elements

## Requirements

### Requirement 1: Core Data Model

**User Story:** As a library user, I want a graph-based data model, so that I can represent complex railway network topologies.

#### Acceptance Criteria

1. THE RailGraph SHALL store nodes as a collection of RailNode instances
2. THE RailGraph SHALL store edges as a collection of RailEdge instances
3. THE RailGraph SHALL store lines as a collection of RailLine instances
4. THE RailNode SHALL contain an identifier, name, type, and coordinate properties
5. THE RailEdge SHALL contain source node, target node, length, and geometry properties
6. THE RailLine SHALL contain an identifier, name, and ordered list of edge references
7. THE RailGraph SHALL provide methods to query nodes by identifier
8. THE RailGraph SHALL provide methods to query edges by source and target nodes
9. THE RailGraph SHALL provide methods to traverse connected edges from a given node

### Requirement 2: Coordinate System Support

**User Story:** As a library user, I want multiple coordinate systems, so that I can work with different positioning schemes.

#### Acceptance Criteria

1. THE RailNode SHALL support Screen_Coordinate positioning (x, y in pixels)
2. THE RailNode SHALL support Linear_Coordinate positioning (distance along track)
3. THE RailNode SHALL support Geographic_Coordinate positioning (latitude, longitude)
4. THE RailEdge SHALL support geometry definition using Screen_Coordinate arrays
5. THE RailEdge SHALL support geometry definition using Geographic_Coordinate arrays
6. WHERE Linear_Coordinate is used, THE RailNode SHALL reference a track identifier
7. THE RailGraph SHALL validate that all nodes use consistent coordinate systems

### Requirement 3: railML 3 XML Parser

**User Story:** As a railway data engineer, I want to parse railML 3 files, so that I can import standardized railway infrastructure data.

#### Acceptance Criteria

1. WHEN a valid railML 3 XML document is provided, THE railML_Parser SHALL parse it into a RailGraph instance
2. THE railML_Parser SHALL extract topology elements (netElements, netRelations) into RailNode and RailEdge instances
3. THE railML_Parser SHALL extract screenPositioningSystem coordinates into Screen_Coordinate properties
4. THE railML_Parser SHALL extract geographic coordinates into Geographic_Coordinate properties
5. THE railML_Parser SHALL extract track lengths and convert them to edge length properties
6. THE railML_Parser SHALL extract switch definitions and map them to RailEdge type properties
7. THE railML_Parser SHALL extract signal positions and create RailNode instances with signal type
8. WHEN an invalid railML 3 document is provided, THE railML_Parser SHALL return a descriptive error with line number
9. WHEN required elements are missing, THE railML_Parser SHALL return an error listing missing elements

### Requirement 4: JSON Schema and Parser

**User Story:** As a web developer, I want a JSON format for railway data, so that I can easily integrate with JavaScript applications.

#### Acceptance Criteria

1. THE JSON_Schema SHALL define a structure for nodes with id, name, type, and coordinates
2. THE JSON_Schema SHALL define a structure for edges with id, source, target, length, and geometry
3. THE JSON_Schema SHALL define a structure for lines with id, name, and edge references
4. WHEN a valid JSON document conforming to JSON_Schema is provided, THE JSON_Parser SHALL parse it into a RailGraph instance
5. WHEN an invalid JSON document is provided, THE JSON_Parser SHALL return a descriptive error with field path
6. THE JSON_Serializer SHALL convert RailGraph instances into valid JSON conforming to JSON_Schema
7. FOR ALL valid RailGraph instances, parsing then serializing then parsing SHALL produce an equivalent RailGraph (round-trip property)

### Requirement 5: Programmatic Builder API

**User Story:** As a developer, I want a fluent API to construct railway networks, so that I can generate schematic diagrams programmatically.

#### Acceptance Criteria

1. THE Builder_API SHALL provide a method to create a new RailGraph instance
2. THE Builder_API SHALL provide a method to add nodes with chained configuration
3. THE Builder_API SHALL provide a method to add edges with chained configuration
4. THE Builder_API SHALL provide a method to add lines with chained configuration
5. THE Builder_API SHALL validate node references when adding edges
6. THE Builder_API SHALL validate edge references when adding lines
7. WHEN an invalid reference is provided, THE Builder_API SHALL throw an error with the invalid identifier
8. THE Builder_API SHALL return the constructed RailGraph instance

### Requirement 6: Basic SVG Renderer

**User Story:** As a library user, I want to render railway networks as SVG, so that I can display them in web browsers.

#### Acceptance Criteria

1. WHEN a RailGraph is provided, THE Renderer SHALL generate valid SVG markup
2. THE Renderer SHALL render RailEdge instances as SVG path elements
3. THE Renderer SHALL render RailNode instances with type "station" as SVG circle elements
4. THE Renderer SHALL render RailNode instances with type "signal" as SVG polygon elements
5. THE Renderer SHALL apply Styling_Configuration to rendered elements
6. THE Renderer SHALL set SVG viewBox based on the bounding box of all coordinates
7. THE Renderer SHALL add CSS classes to elements for external styling
8. WHEN Screen_Coordinate is used, THE Renderer SHALL use coordinates directly
9. WHEN Geographic_Coordinate is used, THE Renderer SHALL project coordinates to screen space using Web Mercator projection

### Requirement 7: Track Primitive Rendering

**User Story:** As a library user, I want accurate track geometry rendering, so that schematics display realistic track shapes.

#### Acceptance Criteria

1. WHEN a RailEdge has geometry type "straight", THE Renderer SHALL render it as a straight SVG line
2. WHEN a RailEdge has geometry type "curve", THE Renderer SHALL render it as a cubic Bézier curve
3. THE Renderer SHALL calculate Bézier control points based on edge curvature properties
4. WHEN a RailEdge has geometry type "switch", THE Renderer SHALL apply the appropriate Switch_Template
5. THE Renderer SHALL render parallel tracks with configurable spacing
6. THE Renderer SHALL render track centerlines with configurable stroke width
7. THE Renderer SHALL render track ballast with configurable fill color

### Requirement 8: Switch Rendering Templates

**User Story:** As a railway engineer, I want standardized switch symbols, so that schematics follow industry conventions.

#### Acceptance Criteria

1. THE Renderer SHALL provide a Switch_Template for left turnout switches
2. THE Renderer SHALL provide a Switch_Template for right turnout switches
3. THE Renderer SHALL provide a Switch_Template for double crossovers
4. THE Renderer SHALL provide a Switch_Template for single crossovers
5. WHEN a RailEdge has switch_type "left_turnout", THE Renderer SHALL apply the left turnout template
6. WHEN a RailEdge has switch_type "right_turnout", THE Renderer SHALL apply the right turnout template
7. THE Renderer SHALL orient switch templates based on edge direction
8. THE Renderer SHALL scale switch templates based on Styling_Configuration

### Requirement 9: Track Styling Configuration

**User Story:** As a designer, I want to customize track appearance, so that schematics match my visual requirements.

#### Acceptance Criteria

1. THE Styling_Configuration SHALL define track stroke color
2. THE Styling_Configuration SHALL define track stroke width
3. THE Styling_Configuration SHALL define track fill color
4. THE Styling_Configuration SHALL define station marker radius
5. THE Styling_Configuration SHALL define signal marker size
6. THE Styling_Configuration SHALL define switch template scale factor
7. THE Renderer SHALL apply Styling_Configuration to all rendered elements
8. WHERE Styling_Configuration is not provided, THE Renderer SHALL use default styling values

### Requirement 10: CoordinateBridge for Linear Referencing

**User Story:** As a railway operations engineer, I want to convert between linear and screen coordinates, so that I can position elements by track distance.

#### Acceptance Criteria

1. THE CoordinateBridge SHALL accept a RailGraph with Linear_Coordinate nodes
2. THE CoordinateBridge SHALL accept a RailGraph with Screen_Coordinate nodes as a reference
3. THE CoordinateBridge SHALL provide a method to project Linear_Coordinate to Screen_Coordinate
4. THE CoordinateBridge SHALL provide a method to project Screen_Coordinate to Linear_Coordinate
5. THE CoordinateBridge SHALL interpolate positions along edges based on linear distance
6. WHEN a Linear_Coordinate falls outside the track range, THE CoordinateBridge SHALL return an error
7. FOR ALL valid Linear_Coordinate values, projecting to screen then back to linear SHALL produce a coordinate within 0.1% tolerance (round-trip property)
8. THE CoordinateBridge SHALL handle multi-segment tracks by accumulating distances

### Requirement 11: TypeScript Type Definitions

**User Story:** As a TypeScript developer, I want complete type definitions, so that I get compile-time type safety and IDE autocomplete.

#### Acceptance Criteria

1. THE Package SHALL export TypeScript type definitions for RailGraph
2. THE Package SHALL export TypeScript type definitions for RailNode
3. THE Package SHALL export TypeScript type definitions for RailEdge
4. THE Package SHALL export TypeScript type definitions for RailLine
5. THE Package SHALL export TypeScript type definitions for all coordinate types
6. THE Package SHALL export TypeScript type definitions for Styling_Configuration
7. THE Package SHALL export TypeScript type definitions for all parser interfaces
8. THE Package SHALL compile with TypeScript strict mode enabled
9. THE Package SHALL have zero TypeScript compilation errors

### Requirement 12: Error Handling System

**User Story:** As a developer, I want descriptive error messages, so that I can quickly diagnose and fix integration issues.

#### Acceptance Criteria

1. WHEN a parser encounters invalid input, THE Error_Handler SHALL return an error with the specific validation failure
2. WHEN a parser encounters invalid XML, THE Error_Handler SHALL include the line number and column
3. WHEN a parser encounters invalid JSON, THE Error_Handler SHALL include the field path
4. WHEN the Builder_API receives an invalid reference, THE Error_Handler SHALL include the invalid identifier
5. WHEN the CoordinateBridge receives out-of-range coordinates, THE Error_Handler SHALL include the coordinate value and valid range
6. THE Error_Handler SHALL use custom error classes for different error categories
7. THE Error_Handler SHALL include error codes for programmatic error handling
8. THE Error_Handler SHALL not expose internal implementation details in error messages

### Requirement 13: Package Structure and Exports

**User Story:** As a package consumer, I want a well-organized module structure, so that I can import only what I need.

#### Acceptance Criteria

1. THE Package SHALL be published as @rail-schematic-viz/core
2. THE Package SHALL export the RailGraph class from the main entry point
3. THE Package SHALL export all parser classes from a parsers submodule
4. THE Package SHALL export the Renderer class from a renderer submodule
5. THE Package SHALL export the CoordinateBridge class from a coordinates submodule
6. THE Package SHALL export the Builder_API from a builder submodule
7. THE Package SHALL export all TypeScript types from a types submodule
8. THE Package SHALL include package.json with correct entry points for ESM and CommonJS
9. THE Package SHALL include a README with installation and basic usage examples
